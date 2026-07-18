"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/Input";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError("Group name is required.");
          return;
        }
        router.push("/dashboard");
      }}
    >
      <Input
        error={error}
        label="Group Name"
        onChange={(event) => {
          setName(event.target.value);
          setError("");
        }}
        placeholder="College Circle"
        value={name}
      />
      <Input
        label="Description"
        multiline
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What history will this group preserve?"
        value={description}
      />
      <ImageUploader label="Cover Image" />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button href="/dashboard" variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Create Group</Button>
      </div>
    </form>
  );
}
