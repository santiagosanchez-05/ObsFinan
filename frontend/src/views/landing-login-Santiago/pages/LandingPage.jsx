import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  Users,
  HeartPulse,
  Scale,
  Building2,
  User,
  UserCog,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import univalleLogo from '../../../assets/univalleLogo.png';
import boliviaMap from '../../../assets/boliviamap.jpg';

const QUE_ES = [
  {
    icon: TrendingUp,
    titulo: 'Medición',
    texto:
      'Recopilación sistemática y rigurosa de datos financieros a nivel nacional para establecer líneas base de bienestar.',
  },
  {
    icon: Search,
    titulo: 'Investigación',
    texto:
      'Análisis profundo de tendencias económicas y comportamientos financieros mediante metodologías académicas probadas.',
  },
  {
    icon: Users,
    titulo: 'Impacto Social',
    texto:
      'Generación de políticas públicas y programas educativos basados en evidencia para mejorar la calidad de vida.',
  },
];

const INDICADORES = [
  {
    icon: HeartPulse,
    titulo: 'Índice de Calidad Aseguradora (ICA)',
    texto: 'Conocimiento, uso, educación y previsión frente a los seguros en comunas de Bolivia.',
  },
  {
    icon: Scale,
    titulo: 'Brecha de Género — ICA',
    texto: 'Comparación del ICA entre hombres y mujeres por comuna.',
  },
  {
    icon: Building2,
    titulo: 'Confianza del Sector Exportador',
    texto: 'Expectativas macroeconómicas y barreras al comercio exterior de empresas bolivianas.',
  },
  {
    icon: TrendingUp,
    titulo: 'Propensión a Invertir',
    texto: 'Porcentaje de empresas exportadoras que planea invertir en los próximos 12 meses.',
  },
];

const ROLES = [
  {
    icon: User,
    titulo: 'Visitante',
    texto: 'Consulta libre de los dashboards de ICA y Sector Privado Exportador, sin necesidad de cuenta.',
  },
  {
    icon: UserCog,
    titulo: 'Administrador',
    texto: 'Carga de datos ICA de su sede, validación local y gestión de eventos.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Superadmin',
    texto: 'Gestión total del sistema: usuarios, sedes, carga de datos ICA y Sector Privado Exportador.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center">
        <h1 className="text-4xl font-bold leading-tight text-ink md:text-5xl">
          Midiendo el Bienestar Financiero en <span className="text-maroon">Bolivia</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-ink/60">
          Un observatorio de la Universidad Privada del Valle dedicado al análisis y publicación
          de indicadores de salud financiera nacional.
        </p>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-8">
          <img
            src={boliviaMap}
            alt="Mapa de Bolivia"
            className="h-56 w-full rounded-xl object-contain sm:h-72 md:h-96"
          />
        </div>
      </section>

      {/* QUÉ ES EL OBSERVATORIO */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-ink">¿Qué es el Observatorio?</h2>
          <p className="mt-2 text-ink/60">
            Presencia nacional a través de nuestras 5 sedes: Cochabamba, La Paz, Santa Cruz, Sucre
            y Trinidad.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {QUE_ES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-black/5 bg-surface p-6 text-left">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-maroon/10">
                  <Icon size={18} className="text-maroon" />
                </div>
                <h3 className="font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm text-ink/60">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDICADORES CLAVE */}
      <section className="bg-surface px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink">Indicadores Clave</h2>
              <p className="mt-1 text-sm text-ink/60">Métricas fundamentales monitoreadas a nivel nacional.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INDICADORES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-black/5 bg-white p-5">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-maroon/10">
                  <Icon size={18} className="text-maroon" />
                </div>
                <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-xs text-ink/60">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESO A LA PLATAFORMA */}
      <section className="bg-white px-6 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-ink">Acceso a la Plataforma</h2>
          <p className="mt-2 text-ink/60">Diferentes niveles de acceso según tu rol en el observatorio.</p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ROLES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="rounded-2xl border border-black/5 bg-surface p-6 text-left">
                <Icon size={18} className="text-maroon" />
                <h3 className="mt-3 font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm text-ink/60">{texto}</p>
              </div>
            ))}
          </div>

          <Link
            to="/login"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-ink/90"
          >
            Iniciar sesión en la plataforma
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink px-6 py-12 text-white/70">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <img src={univalleLogo} alt="Univalle" className="h-8 w-8" />
              <span className="font-semibold text-white">Univalle</span>
            </div>
            <p className="mt-3 text-sm">
              Observatorio de Bienestar Financiero, dedicado a proporcionar datos precisos para la
              toma de decisiones en Bolivia.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white">Contacto</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin size={14} /> Campus Tiquipaya, Cochabamba, Bolivia
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} /> observatorio@univalle.edu
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} /> +591 (4) 4318800
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Enlaces</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white">Inicio</Link>
              </li>
              <li>
                <Link to="/ica" className="hover:text-white">Dashboard ICA</Link>
              </li>
              <li>
                <Link to="/spe" className="hover:text-white">Dashboard Sector Privado Exportador</Link>
              </li>
              <li>
                <Link to="/sobre-nosotros" className="hover:text-white">Sobre nosotros</Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-5xl border-t border-white/10 pt-6 text-xs">
          © {new Date().getFullYear()} Universidad Privada del Valle. Todos los derechos reservados.
        </p>
      </footer>
    </>
  );
}
