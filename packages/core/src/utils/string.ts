export function transformTemplate(
  template: string,
  data: Record<string, any>
): string {
  return template.replace(/<% (.+?) %>/g, (_, name) => {
    return data[name.trim()] ?? "";
  });
}
