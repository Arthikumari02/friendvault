export function validateGroup(name: string, description: string) {
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const nameLength = Array.from(trimmedName).length;
  const descriptionLength = Array.from(trimmedDescription).length;

  return {
    nameError: nameLength === 0
      ? "Group name is required."
      : nameLength > 100
        ? "Group name must be 100 characters or fewer."
        : "",
    descriptionError: descriptionLength > 2000
      ? "Description must be 2,000 characters or fewer."
      : "",
  };
}
