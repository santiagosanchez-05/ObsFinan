const SESSION_EXPIRED_EVENT = "bfu:session-expired";
const SESSION_EXPIRED_STORAGE_KEY = "bfu_session_expired";

export class SessionExpiredError extends Error {
  constructor(message = "La sesión ha expirado") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

function notificarSesionExpirada() {
  const timestamp = String(Date.now());

  localStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, timestamp);

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: {
        timestamp,
      },
    }),
  );
}

export default async function apiFetch(input, init = {}) {
  const response = await fetch(input, init);

  if (response.status === 401) {
    notificarSesionExpirada();

    throw new SessionExpiredError();
  }

  return response;
}
