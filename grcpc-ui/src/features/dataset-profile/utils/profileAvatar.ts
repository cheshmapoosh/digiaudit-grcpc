export function profileAvatarForeground(color: string): string {
  const rgb = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255) : [0, 0, 0];
  const linear = rgb.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
  return 1.05 / (luminance + .05) >= (luminance + .05) / .05 ? "#ffffff" : "#000000";
}
