"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type AccessRequestRow = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
};

export function AccessRequestsPanel({ initial }: { initial: AccessRequestRow[] }) {
  const [rows, setRows] = React.useState(initial);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const pending = rows.filter((r) => r.status === "pending");

  async function approve(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/access-requests/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Approve failed");
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "approved", decided_at: new Date().toISOString() } : r
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access requests</CardTitle>
        <CardDescription>
          New users submit a request. Approving sends an email invite to set their password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-3 text-sm text-[hsl(var(--destructive))]">{error}</p> : null}
        <div className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">
          Pending: <b>{pending.length}</b>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <Button
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => approve(r.id)}
                    >
                      {busyId === r.id ? "Approving..." : "Approve"}
                    </Button>
                  ) : (
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

