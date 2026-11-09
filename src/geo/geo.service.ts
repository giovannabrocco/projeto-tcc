import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { falhar } from '../common/api-exception';
import { somenteDigitos } from '../common/util';

export interface Endereco {
  cep: string;
  cidade: string;
  estado: string;
  bairro: string;
  rua: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * CEP -> endereço + coordenadas (necessárias ao cálculo de distância/Haversine do matching).
 * 1) BrasilAPI v2 (traz coordenadas quando disponíveis)   2) ViaCEP (só endereço)
 * 3) Nominatim/OpenStreetMap para obter lat/lng quando as anteriores não trazem.
 * Resultado fica em cache em memória (CEP não muda).
 */
@Injectable()
export class GeoService {
  private readonly logger = new Logger('Geo');
  private readonly cache = new Map<string, Endereco>();

  async buscarCep(cepBruto: string): Promise<Endereco> {
    const cep = somenteDigitos(cepBruto);
    if (cep.length !== 8) falhar(400, 'CEP inválido.', { campos: { cep: 'Informe 8 dígitos.' } });
    const emCache = this.cache.get(cep);
    if (emCache) return emCache;

    let end: Endereco | null = null;
    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cep/v2/${cep}`, { timeout: 6000 });
      const c = data?.location?.coordinates;
      end = {
        cep,
        cidade: data.city ?? '',
        estado: data.state ?? '',
        bairro: data.neighborhood ?? '',
        rua: data.street ?? '',
        latitude: c?.latitude != null ? Number(c.latitude) : null,
        longitude: c?.longitude != null ? Number(c.longitude) : null,
      };
    } catch (e: any) {
      if (e?.response?.status === 404) {
        // BrasilAPI diz que não existe; confirma no ViaCEP antes de recusar
        end = await this.viaCep(cep);
        if (!end) falhar(400, 'CEP não encontrado.', { campos: { cep: 'CEP não encontrado.' } });
      } else {
        this.logger.warn(`BrasilAPI indisponível (${e?.message}); tentando ViaCEP.`);
        end = await this.viaCep(cep);
        if (!end) falhar(400, 'Não foi possível consultar o CEP agora. Tente novamente.', { campos: { cep: 'Serviço de CEP indisponível.' } });
      }
    }

    if (end.latitude === null || end.longitude === null) {
      const pos = await this.geocodificar(end);
      end.latitude = pos?.latitude ?? null;
      end.longitude = pos?.longitude ?? null;
    }
    this.cache.set(cep, end);
    return end;
  }

  private async viaCep(cep: string): Promise<Endereco | null> {
    try {
      const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 6000 });
      if (data?.erro) return null;
      return {
        cep,
        cidade: data.localidade ?? '',
        estado: data.uf ?? '',
        bairro: data.bairro ?? '',
        rua: data.logradouro ?? '',
        latitude: null,
        longitude: null,
      };
    } catch {
      return null;
    }
  }

  private async geocodificar(e: Endereco) {
    const consultas = [
      [e.rua, e.bairro, e.cidade, e.estado],
      [e.bairro, e.cidade, e.estado],
      [e.cidade, e.estado],
    ]
      .map((p) => p.filter(Boolean).join(', '))
      .filter((q) => q.length > 3);
    for (const q of consultas) {
      try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: { format: 'json', limit: 1, countrycodes: 'br', q },
          headers: { 'User-Agent': 'Conectus-TCC/1.0 (triagem de celulas)' },
          timeout: 6000,
        });
        if (data?.[0]) return { latitude: Number(data[0].lat), longitude: Number(data[0].lon) };
      } catch (err: any) {
        this.logger.warn(`Nominatim falhou para "${q}": ${err?.message}`);
      }
    }
    return null;
  }
}
