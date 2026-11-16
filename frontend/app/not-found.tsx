import NotFoundView from "./components/NotFoundView";

export default function NotFound() {
  return (
    <NotFoundView
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved."
      actions={[
        { href: "/", label: "Go home" },
        { href: "/blogs", label: "Browse blogs" },
      ]}
    />
  );
}
