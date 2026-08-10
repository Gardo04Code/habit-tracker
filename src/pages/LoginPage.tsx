import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { normalizeSupabaseError } from "../lib/errors";

type Mode = "signIn" | "signUp";

/**
 * Integración mínima de autenticación, SIN diseño definitivo — pendiente
 * de la revisión visual real del producto (ver
 * MDs/12_BACKEND_INTEGRATION_SETUP.md, "Qué falta para el siguiente
 * subpaso"). Su único propósito en esta tarea es permitir ejercer
 * signIn/signUp de punta a punta contra Supabase Local y darle un destino
 * real a ProtectedRoute.
 */
export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (mode === "signIn") {
        await signIn(email, password);
        navigate("/", { replace: true });
      } else {
        const { requiresEmailConfirmation } = await signUp(email, password, name);
        if (requiresEmailConfirmation) {
          setInfo("Cuenta creada. Confirma tu correo antes de iniciar sesión.");
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (caught) {
      setError(normalizeSupabaseError(caught).friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-lg font-semibold text-text-primary">
          {mode === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signUp" && (
            <Input
              label="Nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
          <Input
            label="Correo"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-text-secondary">{info}</p>}

          <Button type="submit" isLoading={isSubmitting}>
            {mode === "signIn" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-text-secondary underline"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "signIn" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </Card>
    </div>
  );
}
