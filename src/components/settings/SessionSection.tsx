import { useState } from "react";
import { LogOut } from "lucide-react";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function SessionSection() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-4">
      <SectionHeader title="Sesión" description="Administra tu sesión actual." />
      <Button
        variant="danger"
        size="sm"
        leadingIcon={<LogOut size={14} />}
        className="self-start"
        onClick={() => setIsConfirmOpen(true)}
      >
        Cerrar sesión
      </Button>

      {isConfirmOpen && (
        <Modal
          isOpen
          onClose={() => setIsConfirmOpen(false)}
          title="Cerrar sesión"
          description="Esta es una versión de demostración: cerrar sesión todavía no está conectado a un backend real."
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => setIsConfirmOpen(false)}>
                Entendido
              </Button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Cuando se conecte Supabase, esta acción cerrará tu sesión de verdad y te llevará a la pantalla de inicio de sesión.
          </p>
        </Modal>
      )}
    </Card>
  );
}
