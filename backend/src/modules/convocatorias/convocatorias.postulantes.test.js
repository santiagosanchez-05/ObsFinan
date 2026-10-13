const request = require("supertest");
const jwt = require("jsonwebtoken");

// US53 — aprobar/rechazar postulantes. La sede se controla ANTES de crear la cuenta.
jest.mock("../../config/db", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock("../../config/mailer", () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));
jest.mock("../users/users.service", () => ({
  ...jest.requireActual("../users/users.service"),
  registrarUsuario: jest.fn(),
}));

const pool = require("../../config/db");
const { registrarUsuario } = require("../users/users.service");
const app = require("../../app");
const { ESTADO_POSTULANTE } = require("../../config/estados");

const token = (role, campusId = 1) =>
  jwt.sign({ userId: 7, role, campusId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

const postulante = (cambios = {}) => [
  [
    {
      applicant_id: 4,
      user_id: null,
      first_name: "Ana",
      paternal_last_name: "Paz",
      maternal_last_name: null,
      email: "ana@correo.com",
      status: ESTADO_POSTULANTE.PENDIENTE,
      campus_id: 2,
      ...cambios,
    },
  ],
];

const patch = (role, campusId, status) =>
  request(app)
    .patch("/api/convocatorias/postulaciones/4")
    .set("Authorization", `Bearer ${token(role, campusId)}`)
    .send({ status });

beforeEach(() => jest.clearAllMocks());

describe("PATCH /api/convocatorias/postulaciones/:id", () => {
  it("el Admin de otra sede no puede aprobar: no se crea la cuenta ni se toca el postulante", async () => {
    pool.query.mockResolvedValueOnce(postulante());
    const res = await patch("admin", 1, ESTADO_POSTULANTE.APROBADO);
    expect(res.status).toBe(403);
    expect(registrarUsuario).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1); // solo la lectura
  });

  it("el Admin de la sede aprueba: crea el encuestador en la sede de la convocatoria", async () => {
    pool.query
      .mockResolvedValueOnce(postulante())
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    registrarUsuario.mockResolvedValue({ userId: 30 });
    const res = await patch("admin", 2, ESTADO_POSTULANTE.APROBADO);
    expect(res.status).toBe(200);
    expect(registrarUsuario).toHaveBeenCalledWith(
      expect.objectContaining({
        rol: "encuestador",
        campusId: 2,
        correo: "ana@correo.com",
      }),
    );
    expect(pool.query.mock.calls[1][1]).toEqual([
      ESTADO_POSTULANTE.APROBADO,
      30,
      7,
      4,
      ESTADO_POSTULANTE.PENDIENTE,
    ]);
  });

  it("rechazar no crea cuenta", async () => {
    pool.query
      .mockResolvedValueOnce(postulante())
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.RECHAZADO);
    expect(res.status).toBe(200);
    expect(registrarUsuario).not.toHaveBeenCalled();
  });

  it("un postulante ya aprobado no se vuelve a aprobar", async () => {
    pool.query.mockResolvedValueOnce(
      postulante({ status: ESTADO_POSTULANTE.APROBADO }),
    );
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.APROBADO);
    expect(res.status).toBe(409);
  });

  // BUG #8 — un postulante rechazado no puede volver a procesarse
  it("un postulante rechazado no puede pasar a aprobado: 409, sin cuenta y sin UPDATE", async () => {
    pool.query.mockResolvedValueOnce(
      postulante({ status: ESTADO_POSTULANTE.RECHAZADO }),
    );
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.APROBADO);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Este postulante ya fue rechazado");
    expect(registrarUsuario).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1); // solo la lectura, sin UPDATE
  });

  it("un postulante rechazado no puede volver a rechazarse: 409 y sin UPDATE", async () => {
    pool.query.mockResolvedValueOnce(
      postulante({ status: ESTADO_POSTULANTE.RECHAZADO }),
    );
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.RECHAZADO);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Este postulante ya fue rechazado");
    expect(registrarUsuario).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it("si otra solicitud ya cambió el estado (UPDATE sin filas afectadas) responde 409", async () => {
    pool.query
      .mockResolvedValueOnce(postulante())
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.RECHAZADO);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      "Este postulante ya fue procesado por otra solicitud",
    );
  });

  it("si el correo ya tiene cuenta responde 409", async () => {
    pool.query.mockResolvedValueOnce(postulante());
    registrarUsuario.mockRejectedValue(new Error("CORREO_YA_REGISTRADO"));
    const res = await patch("superadmin", 1, ESTADO_POSTULANTE.APROBADO);
    expect(res.status).toBe(409);
  });
});
