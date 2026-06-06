import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Intercepts navigation when isDirty is true and asks the user to confirm
 * before leaving. Handles both browser close/reload (beforeunload) and
 * in-app Wouter navigation (pushState override).
 */
export function useUnsavedChanges(isDirty: boolean) {
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Ref keeps the latest isDirty value accessible inside the pushState override
  // without needing to re-run the effect whenever isDirty changes.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Ref to the original pushState so handleConfirm can navigate without
  // going through our own override.
  const originalPushStateRef = useRef<typeof window.history.pushState | null>(null);

  useEffect(() => {
    // ── Block browser close / tab reload ────────────────────────────────────
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // ── Intercept Wouter's pushState calls ───────────────────────────────────
    const original = window.history.pushState.bind(window.history);
    originalPushStateRef.current = original;

    window.history.pushState = function (
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) {
      if (isDirtyRef.current && url != null) {
        const path = typeof url === "string" ? url : url.toString();
        const current =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        // Only intercept real route changes, not same-page updates
        if (path !== current) {
          setPendingPath(path);
          setDialogOpen(true);
          return; // block navigation until user confirms
        }
      }
      original(data, unused, url);
    };

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.history.pushState = original;
      originalPushStateRef.current = null;
    };
  }, []); // runs once — isDirty is read via ref

  // ── Confirm: navigate to the blocked path ───────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!pendingPath) return;
    const path = pendingPath;
    setDialogOpen(false);
    setPendingPath(null);
    // Call the original pushState directly, then fire popstate so Wouter
    // picks up the new location without going through our override.
    const original = originalPushStateRef.current;
    if (original) {
      original({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      window.location.href = path;
    }
  }, [pendingPath]);

  // ── Cancel: stay on the current page ────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setPendingPath(null);
  }, []);

  // Stable-ish component: only re-creates when dialog open state or handlers
  // change, which is acceptable (dialog is invisible 99% of the time).
  const ConfirmDialog = useCallback(
    function ConfirmDialog() {
      return (
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Alterações não salvas</DialogTitle>
              <DialogDescription>
                Você tem alterações não salvas. Se sair agora, elas serão
                perdidas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
              <Button variant="outline" onClick={handleCancel}>
                Continuar editando
              </Button>
              <Button variant="destructive" onClick={handleConfirm}>
                Sair sem salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
    [dialogOpen, handleConfirm, handleCancel]
  );

  return { ConfirmDialog };
}
