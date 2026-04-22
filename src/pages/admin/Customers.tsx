import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  slogan: string | null;
  support_email: string | null;
  color_accent: string | null;
  rolling_window_days: number | null;
}

const CustomersPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});

  const onNew = () => { setEditing(null); setForm({ name: "", color_accent: "#3B82F6", rolling_window_days: 14 }); setOpen(true); };
  const onEdit = (c: Customer) => { setEditing(c); setForm(c); setOpen(true); };

  const onSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    if (editing) {
      const { error } = await supabase.from("customers").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert(form as any);
      if (error) return toast.error(error.message);
      toast.success("Customer created");
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage tenant organizations on the AMP platform</p>
          </div>
          <Button onClick={onNew}><Plus className="w-4 h-4 mr-2" /> New customer</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden amp-shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Support email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Window (days)</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color_accent}20`, color: c.color_accent || undefined }}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          {c.slogan && <div className="text-xs text-muted-foreground">{c.slogan}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{c.support_email || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.rolling_window_days ?? 14}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(c.id)}><Trash2 className="w-4 h-4 text-amp-risk" /></Button>
                    </td>
                  </tr>
                ))}
                {(data || []).length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No customers yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Slogan</Label><Input value={form.slogan || ""} onChange={(e) => setForm({ ...form, slogan: e.target.value })} /></div>
            <div><Label>Support email</Label><Input type="email" value={form.support_email || ""} onChange={(e) => setForm({ ...form, support_email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Accent color</Label><Input type="color" value={form.color_accent || "#3B82F6"} onChange={(e) => setForm({ ...form, color_accent: e.target.value })} /></div>
              <div><Label>Rolling window (days)</Label><Input type="number" value={form.rolling_window_days ?? 14} onChange={(e) => setForm({ ...form, rolling_window_days: parseInt(e.target.value) || 14 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSave}>{editing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default CustomersPage;
