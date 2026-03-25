import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginByName } from "@/features/auth/loginByName";

export const HomePage = () => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      await loginByName(name);
      navigate("/projects");
    } catch {
      setError(
        "Login failed. Make sure server is reachable once to issue a token.",
      );
    }
  };

  return (
    <main className="flex h-full items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded bg-white p-6 shadow"
      >
        <h1 className="mb-4 text-xl font-semibold">Construction Planner</h1>
        <label className="mb-2 block text-sm font-medium">Name</label>
        <input
          className="mb-3 w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button
          className="w-full rounded bg-slate-800 p-2 text-white"
          type="submit"
        >
          Continue
        </button>
      </form>
    </main>
  );
};
