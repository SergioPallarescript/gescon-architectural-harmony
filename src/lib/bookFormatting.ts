export interface OrderSections {
  estado: string;
  instrucciones: string;
  pendientes: string;
}

export const formatOrderSections = (sections: OrderSections) => {
  return [
    `**ESTADO DE LA OBRA:**\n${sections.estado.trim() || "Sin observaciones en esta visita."}`,
    `**INSTRUCCIONES Y ÓRDENES:**\n${sections.instrucciones.trim() || "Sin observaciones en esta visita."}`,
    `**PENDIENTES:**\n${sections.pendientes.trim() || "Sin observaciones en esta visita."}`,
  ].join("\n\n");
};

export const parseOrderSections = (content: string): OrderSections | null => {
  const pattern = /\*\*ESTADO DE LA OBRA:\*\*[\s\n]*([\s\S]*?)\n\n\*\*INSTRUCCIONES Y ÓRDENES:\*\*[\s\n]*([\s\S]*?)\n\n\*\*PENDIENTES:\*\*[\s\n]*([\s\S]*)$/;
  const match = content.match(pattern);

  if (!match) return null;

  return {
    estado: match[1].trim(),
    instrucciones: match[2].trim(),
    pendientes: match[3].trim(),
  };
};