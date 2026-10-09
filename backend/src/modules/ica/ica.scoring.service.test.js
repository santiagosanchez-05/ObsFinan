jest.mock('./ica.service', () => ({
  recalcularAgregadoManual: jest.fn(),
}));

const { recalcularAgregadoManual } = require('./ica.service');
const { recalcularAgregadoIca } = require('./ica.scoring.service');

describe('recalcularAgregadoIca', () => {
  beforeEach(() => {
    recalcularAgregadoManual.mockReset();
  });

  it('rechaza una conexión ausente', async () => {
    await expect(recalcularAgregadoIca({
      communityId: 1,
      year: 2026,
      quarter: 1,
      dataLoadId: 5,
    })).rejects.toThrow('CONEXION_REQUERIDA');
  });

  it('recalcula el agregado con todos los identificadores del período', async () => {
    const conexion = { query: jest.fn() };
    recalcularAgregadoManual.mockResolvedValue({ procesadas: 2 });

    await expect(recalcularAgregadoIca({
      conexion,
      communityId: 3,
      year: 2026,
      quarter: 2,
      dataLoadId: 9,
    })).resolves.toEqual({ procesadas: 2 });

    expect(recalcularAgregadoManual).toHaveBeenCalledWith({
      conexion,
      communityId: 3,
      year: 2026,
      quarter: 2,
      dataLoadId: 9,
    });
  });

  it('rechaza identificadores inválidos', async () => {
    const conexion = { query: jest.fn() };

    await expect(recalcularAgregadoIca({
      conexion,
      communityId: 0,
      year: 2026,
      quarter: 1,
      dataLoadId: 5,
    })).rejects.toThrow('PARAMETROS_ICA_INVALIDOS');
  });
});
