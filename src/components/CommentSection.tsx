"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { formatDate } from "@/utils/date";
import type { Comment } from "@/types";

export function CommentSection({ comments }: { comments: Comment[] }) {
  const [text, setText] = useState("");

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
      <h2 className="text-lg font-semibold text-slate-950">Comments</h2>
      <div className="mt-4 space-y-3">
        {comments.map((comment) => (
          <article className="rounded-2xl bg-slate-50 p-4" key={comment.id}>
            <p className="text-sm leading-6 text-slate-700">{comment.text}</p>
            <p className="mt-2 text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
          </article>
        ))}
      </div>
      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setText("");
        }}
      >
        <div className="flex-1">
          <Input
            label="Add a comment"
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a memory thread..."
            value={text}
          />
        </div>
        <Button className="self-end" type="submit">
          Post
        </Button>
      </form>
    </section>
  );
}
