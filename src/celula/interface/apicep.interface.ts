export interface BrasilApiCepResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  ibge: {
    city: number | null;
    state: number | null;
  };
  timezoneName: string;
  location: {
    type: string;
    coordinates: {
      latitude: number | null;
      longitude: number | null;
    };
  };
}
