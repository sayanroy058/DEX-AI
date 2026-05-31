import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PostAdsDialog } from "@/components/trade/PostAdsDialog";
import { ArrowLeft, CirclePlus, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const columns = ["Type", "ID", "Total Quantity / Limits", "Price", "Fee", "Payment Method", "Status", "Action"];

export default function P2PAdvertiser() {
  const [postAdsDialogOpen, setPostAdsDialogOpen] = useState(false);

  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link to="/p2p" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to P2P
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">My Ads</h1>
            </div>
            <Button className="gap-2 rounded-full" onClick={() => setPostAdsDialogOpen(true)}>
              <CirclePlus className="h-4 w-4" />
              Post Ads
            </Button>
          </div>

          <Card className="overflow-hidden border-border/50 bg-card/30 backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-border/40 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-8">
                <button className="relative py-2 text-sm font-bold text-primary">
                  Listed
                  <span className="absolute inset-x-0 -bottom-5 h-0.5 bg-primary" />
                </button>
                <button className="py-2 text-sm font-bold text-muted-foreground hover:text-foreground">All Ads</button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">Active Mode</span>
                <span className="relative inline-flex h-6 w-12 items-center rounded-full bg-primary/80 p-1">
                  <span className="h-4 w-4 translate-x-6 rounded-full bg-white shadow" />
                </span>
                <span className="text-primary">Automatic Inactive Mode</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    {columns.map(column => (
                      <th key={column} className="px-6 py-4 text-left font-medium">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length} className="h-72 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                          <ClipboardList className="h-8 w-8 text-primary" />
                        </div>
                        <div>Oops, you don't have any active ad.</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/30 px-6 py-4">
              <Button variant="ghost" size="icon" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="secondary" className="h-9 px-4 text-sm">1</Badge>
              <Button variant="ghost" size="icon" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <PostAdsDialog
        open={postAdsDialogOpen}
        onOpenChange={setPostAdsDialogOpen}
      />
    </AppShell>
  );
}
