"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ImageUploader } from "@/components/ImageUploader";
import { Input } from "@/components/Input";

export function CreateMemoryForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-indigo-100"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          setError("Title is required.");
          return;
        }
        router.push(`/groups/${groupId}`);
      }}
    >
      <Input
        error={error}
        label="Title"
        onChange={(event) => {
          setTitle(event.target.value);
          setError("");
        }}
        placeholder="Sunrise before the drive home"
        value={title}
      />
      <Input
        label="Description"
        multiline
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Tell the story behind this moment."
        value={description}
      />
      <Input
        label="Date"
        onChange={(event) => setDate(event.target.value)}
        type="date"
        value={date}
      />
      <ImageUploader label="Photo Upload" />
      <Input
        label="Location"
        onChange={(event) => setLocation(event.target.value)}
        placeholder="Optional"
        value={location}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button href={`/groups/${groupId}`} variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Save Memory</Button>
      </div>
    </form>
  );
}
