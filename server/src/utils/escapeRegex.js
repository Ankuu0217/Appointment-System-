// Escapes every regex metacharacter so user input is matched literally.
export default function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
