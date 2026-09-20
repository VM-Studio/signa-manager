// El grupo (auth) no lleva header ni barra inferior: solo el login.
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
