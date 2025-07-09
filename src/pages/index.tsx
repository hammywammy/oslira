import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">AI Outreach Platform</h1>
      <p className="mb-8 text-gray-700">Automate your B2B outreach with AI-powered multi-channel campaigns.</p>
      <Link
        to="/login"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Get Started
      </Link>
    </div>
  );
}
