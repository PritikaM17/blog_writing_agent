import NotFoundView from "@/app/components/NotFoundView";

export default function BlogNotFound() {
  return (
    <NotFoundView
      title="Blog not found"
      message="It may have been deleted, or the link is wrong."
      actions={[
        { href: "/blogs", label: "All blogs" },
        { href: "/generate", label: "Write a new one" },
      ]}
    />
  );
}
