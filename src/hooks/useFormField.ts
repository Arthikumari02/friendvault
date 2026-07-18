"use client";

import { useCallback, useState } from "react";

export function useFormField(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(event.target.value);
    },
    [],
  );

  return { value, onChange, setValue };
}
