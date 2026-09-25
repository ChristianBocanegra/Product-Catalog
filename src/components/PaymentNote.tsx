// Aviso de cómo y cuándo se paga. La app solo aparta; el pago es por fuera.
export default function PaymentNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="payment-note compact">
        Te escribiré por WhatsApp cuando compre tu producto. Desde ese momento
        puedes pagar en efectivo o por transferencia, a más tardar el día de la entrega.
      </p>
    )
  }

  return (
    <div className="payment-note">
      <strong>¿Cómo se paga?</strong>
      <p>
        Aquí solo apartas el producto, no pagas nada. Cuando lo compre en
        Canadá te escribo por WhatsApp para confirmarte.
      </p>
      <p>
        Desde ese momento puedes pagar en <b>efectivo</b> o por{' '}
        <b>transferencia</b>, a más tardar el día que te lo entregue.
      </p>
    </div>
  )
}