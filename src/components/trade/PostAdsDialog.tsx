import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function PostAdsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [nickname, setNickname] = useState("");
  const valid = nickname.trim().length > 0 && nickname.trim().length <= 15;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden border border-border bg-card p-0 text-foreground shadow-2xl dark:border-primary/20 dark:bg-background/70 dark:shadow-[0_24px_90px_hsl(var(--primary)/0.18)] dark:backdrop-blur-2xl dark:supports-[backdrop-filter]:bg-background/55">
        <div className="border-b border-border bg-muted/20 px-6 py-5 dark:border-white/10 dark:bg-white/[0.03]">
          <DialogHeader>
            <DialogTitle className="text-xl">Set Nickname</DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground dark:border-primary/20 dark:bg-primary/10">
            Please note that your nickname can only be set once and cannot be modified after confirmation.
          </div>
          <p className="text-sm leading-relaxed text-foreground/80 dark:text-muted-foreground">
            Please set a nickname first before posting your ad. Your nickname will be displayed on the advertisement list.
          </p>
          <Input
            value={nickname}
            onChange={event => setNickname(event.target.value)}
            maxLength={15}
            placeholder="Your nickname cannot have more than 15 characters."
            className="h-12 border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary dark:border-primary/30 dark:bg-background/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <Button
              disabled={!valid}
              className="h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              onClick={() => onOpenChange(false)}
            >
              Confirm
            </Button>
            <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
