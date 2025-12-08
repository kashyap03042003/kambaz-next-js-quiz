"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setCurrentUser } from "../reducer";
import { useDispatch } from "react-redux";
import { useState } from "react";
import * as client from "../client";
import { User } from "../../types";
import { FormControl, Button } from "react-bootstrap";

interface Credentials {
  username: string;
  password: string;
}

export default function Signin() {
  const [credentials, setCredentials] = useState<Credentials>({
    username: "",
    password: "",
  });
  const dispatch = useDispatch();
  const router = useRouter();

  const signin = async () => {
    console.log("Trying to sign in with:", credentials);
    try {
      const user: User = await client.signin(credentials);
      console.log("Found user:", user);
      if (!user) {
        alert("Invalid username or password!");
        return;
      }
      dispatch(setCurrentUser(user));
      router.push("/Dashboard");
    } catch (err: unknown) {
      console.error("Signin error:", err);
      alert("Invalid username or password!");
    }
  };

  return (
    <div id="wd-signin-screen" style={{ maxWidth: 360 }}>
      <h1 className="mb-3">Sign in</h1>
      <FormControl
        placeholder="username"
        className="mb-2"
        value={credentials.username}
        onChange={(e) =>
          setCredentials({ ...credentials, username: e.target.value })
        }
      />
      <FormControl
        placeholder="password"
        type="password"
        className="mb-3"
        value={credentials.password}
        onChange={(e) =>
          setCredentials({ ...credentials, password: e.target.value })
        }
      />
      <Button
        onClick={signin}
        id="wd-signin-btn"
        className="btn btn-primary w-100 mb-2"
      >
        Sign in
      </Button>
      <Link href="/Account/Signup" id="wd-signup-link" className="small">
        Sign up
      </Link>
      <div 
        className="p-3 rounded"
        style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '3rem'
        }}
      >
        <p className="mb-2 fw-semibold" style={{ color: '#495057', fontSize: '0.9rem' }}>
          Developed by:
        </p>
        <p className="mb-1" style={{ color: '#212529', fontSize: '0.85rem' }}>
          Krishna Kashyap Pasumarthi
        </p>
        <p className="mb-1" style={{ color: '#212529', fontSize: '0.85rem' }}>
          Jayaditya Peddisetti
        </p>
        <p className="mb-0" style={{ color: '#212529', fontSize: '0.85rem' }}>
          Sachet Kanchugar
        </p>
      </div>
    </div>
  );
}