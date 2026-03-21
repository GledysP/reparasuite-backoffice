export function invitarARegistroSoporte(nombreCliente: string | null | undefined, url: string): string {
    const nombre = (nombreCliente ?? '').trim();
  
    const saludo = nombre
      ? `¡Hola *${nombre}*! 👋`
      : '¡Hola! 👋';
  
    const mensaje =
      `${saludo}\n\n` +
      `Es un gusto saludarte de parte de *ReparaSuite*.\n\n` +
      `Para realizar tu solicitud de soporte, gestionar la garantía de tu equipo, ver fotos del proceso y autorizar presupuestos, por favor completa tu registro en nuestro portal oficial aquí:\n${url}`;
  
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }
  
  export function invitarCliente(nombreCliente: string | null | undefined, url: string): string {
    const nombre = (nombreCliente ?? '').trim();
  
    const saludo = nombre
      ? `¡Hola *${nombre}*! 👋`
      : '¡Hola! 👋';
  
    const mensaje =
      `${saludo}\n\n` +
      `Te invito a registrarte en *ReparaSuite* para gestionar tus equipos y ver tus órdenes en tiempo real.\n\n` +
      `Regístrate aquí:\n${url}`;
  
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }