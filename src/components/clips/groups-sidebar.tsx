import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderIcon, FolderOpenIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage, strings } from "@/lib/strings";
import type { Clip, Group } from "@/lib/types";
import { groupsKey, useGroups } from "@/queries/groups";
import { clipsKeys } from "@/queries/clips";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

type Action = { type: "create"; name: string } | { type: "rename"; id: string; name: string } | { type: "delete"; id: string };

export function GroupsSidebar({ selected, onSelect, draggingClip, onDropClip }: { selected: string | null; onSelect: (id: string | null) => void; draggingClip: Clip | null; onDropClip: (groupId: string | null) => void }) {
  const queryClient = useQueryClient();
  const groups = useGroups();
  const [editing, setEditing] = useState<{ group: Group | null } | null>(null);
  const [name, setName] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action.type === "create") await api.groups.create(action.name);
      else if (action.type === "rename") await api.groups.rename(action.id, action.name);
      else await api.groups.remove(action.id);
    },
    onSuccess: async (_, action) => {
      if (action.type === "delete" && selected === action.id) onSelect(null);
      setEditing(null);
      setDeleting(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: groupsKey }), queryClient.invalidateQueries({ queryKey: clipsKeys.all })]);
    },
    onError: (err) => toast.add({ title: errorMessage(err), type: "error" }),
  });
  const editGroup = (group: Group | null) => {
    setName(group?.name ?? "");
    setEditing({ group });
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!editing || !trimmed || mutation.isPending) return;
    mutation.mutate(editing.group
      ? { type: "rename", id: editing.group.id, name: trimmed }
      : { type: "create", name: trimmed });
  };
  const dropProps = (groupId: string | null) => {
    const key = groupId ?? "root";
    const canDrop = draggingClip !== null && draggingClip.groupId !== groupId;
    return {
      onDragOver: (event: React.DragEvent) => {
        if (!canDrop || !event.dataTransfer.types.includes("application/x-easy-cv-clip")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: (event: React.DragEvent) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
      },
      onDrop: (event: React.DragEvent) => {
        if (!canDrop || event.dataTransfer.getData("application/x-easy-cv-clip") !== draggingClip.id) return;
        event.preventDefault();
        setDropTarget(null);
        onDropClip(groupId);
      },
      className: dropTarget === key && canDrop ? "rounded-md ring-2 ring-primary bg-accent" : "rounded-md",
    };
  };
  return (
    <aside className="w-full shrink-0 md:w-52" aria-label={strings.groups.title}>
      <div className="mb-2 flex items-center justify-between px-2">
        <h2 className="text-sm font-semibold">{strings.groups.title}</h2>
        <Button variant="ghost" size="icon-sm" aria-label={strings.groups.create} onClick={() => editGroup(null)}><PlusIcon /></Button>
      </div>
      {groups.isError ? <Button variant="ghost" onClick={() => void groups.refetch()}>{strings.common.retry}</Button> : null}
      <div className="flex gap-1 overflow-x-auto md:flex-col">
        <div {...dropProps(null)}><Button variant={selected === null ? "secondary" : "ghost"} className="w-full justify-start shrink-0" onClick={() => onSelect(null)}><FolderOpenIcon />{strings.groups.root}</Button></div>
        {groups.data?.map((group) => (
          <div key={group.id} {...dropProps(group.id)}>
          <div className="group flex shrink-0 items-center rounded-md hover:bg-muted/50">
            <Button variant={selected === group.id ? "secondary" : "ghost"} className="min-w-0 flex-1 justify-start" onClick={() => onSelect(group.id)}><FolderIcon /><span className="truncate">{group.name}</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${strings.common.moreActions}: ${group.name}`} />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => editGroup(group)}><PencilIcon />{strings.groups.rename}</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(group)}><Trash2Icon />{strings.common.delete}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        ))}
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open && !mutation.isPending) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.group ? strings.groups.rename : strings.groups.create}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="group-name">{strings.groups.name}</FieldLabel>
              <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={64} autoFocus />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setEditing(null)}>{strings.common.cancel}</Button>
              <Button type="submit" disabled={!name.trim() || mutation.isPending}>{strings.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open && !mutation.isPending) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.groups.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleting ? strings.groups.deleteConfirm(deleting.name) : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>{strings.common.cancel}</AlertDialogCancel>
            <Button variant="destructive" disabled={mutation.isPending} onClick={() => { if (deleting) mutation.mutate({ type: "delete", id: deleting.id }); }}>{strings.common.delete}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
