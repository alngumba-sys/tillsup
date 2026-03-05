import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export function DebugAuth() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [rawUser, setRawUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      setSession(session);
      setRawUser(user);
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 Auth Debug Page</h1>

      <div className="space-y-6">
        {/* Auth Context */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Auth Context</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Loading: <span className="text-yellow-400">{String(auth.loading)}</span></div>
            <div>Is Authenticated: <span className="text-yellow-400">{String(auth.isAuthenticated)}</span></div>
            <div>User: <span className="text-yellow-400">{auth.user ? "✅ Present" : "❌ Null"}</span></div>
            <div>Business: <span className="text-yellow-400">{auth.business ? "✅ Present" : "❌ Null"}</span></div>
          </div>
          {auth.user && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <pre className="text-xs overflow-auto">{JSON.stringify(auth.user, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Supabase Session */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Supabase Session</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Session: <span className="text-yellow-400">{session ? "✅ Present" : "❌ Null"}</span></div>
            <div>Raw User: <span className="text-yellow-400">{rawUser ? "✅ Present" : "❌ Null"}</span></div>
          </div>
          {session && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <pre className="text-xs overflow-auto">{JSON.stringify(session, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate("/app/dashboard")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Try Dashboard
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Sign Out
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
            >
              Clear Storage
            </button>
          </div>
        </div>

        {/* Browser Storage */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Browser Storage</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">LocalStorage Keys:</h3>
              <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
                {Object.keys(localStorage).join('\n')}
              </pre>
            </div>
            <div>
              <h3 className="font-bold mb-2">SessionStorage Keys:</h3>
              <pre className="text-xs bg-gray-700 p-2 rounded overflow-auto">
                {Object.keys(sessionStorage).join('\n')}
              </pre>
            </div>
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">📝 Instructions</h2>
          <div className="space-y-2 text-sm">
            <p>1. Open browser console (F12)</p>
            <p>2. Look for auth-related logs (🔐, 👤, ✅, ❌)</p>
            <p>3. Check if there are any errors (red text)</p>
            <p>4. Share what you see above</p>
          </div>
        </div>
      </div>
    </div>
  );
}
