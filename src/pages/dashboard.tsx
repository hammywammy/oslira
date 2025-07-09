import React from "react";
import { useAuth } from "../context/auth-context";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </header>

      <section>
        <p className="mb-4">Welcome, {user?.email}</p>
        <p>Your credits: <strong>TODO: fetch and display credits</strong></p>
      </section>
    </div>
  );
}
