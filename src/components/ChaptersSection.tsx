import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Chapter } from "@/types";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";

interface ChaptersSectionProps {
    audiobookId?: string;
    chapters: Chapter[];
    chaptersLoading: boolean;
    chaptersError: Error | null;
    onAddChapter: () => void;
    onEditChapter: (chapter: Chapter) => void;
    onDeleteChapter: (chapter: Chapter) => void;
}

export default function ChaptersSection({
    audiobookId,
    chapters,
    chaptersLoading,
    chaptersError,
    onAddChapter,
    onEditChapter,
    onDeleteChapter,
}: ChaptersSectionProps) {
    return (
        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
                <div>
                    <p className="font-semibold text-slate-900">Chapters</p>
                    <p className="text-xs text-muted-foreground">
                        Add multiple audio files (chapters) for this audiobook.
                    </p>
                </div>
                <Button
                    type="button"
                    onClick={onAddChapter}
                    disabled={!audiobookId}
                    className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add chapter
                </Button>
            </div>

            {!audiobookId ? (
                <div className="p-4 text-sm text-slate-600">
                    Save this audiobook first, then you can add chapters.
                </div>
            ) : chaptersError ? (
                <div className="p-4 text-sm text-red-600">{chaptersError.message}</div>
            ) : (
                <div className="p-4">
                    <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 whitespace-nowrap px-4">
                                        Title
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 whitespace-nowrap px-4">
                                        Audio URL
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 text-right px-4">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chaptersLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="py-8 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                                        </TableCell>
                                    </TableRow>
                                ) : chapters.length ? (
                                    chapters.map((c) => (
                                        <TableRow key={c.id} className="hover:bg-slate-50/50">
                                            <TableCell className="px-4 py-3 max-w-[260px] truncate">
                                                <span
                                                    className="font-medium text-slate-800"
                                                    title={c.title}
                                                >
                                                    {c.title}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 max-w-[260px] truncate">
                                                {(c as any).content_url ? (
                                                    <a
                                                        href={String((c as any).content_url)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:underline truncate block"
                                                    >
                                                        {String((c as any).content_url)}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onEditChapter(c)}
                                                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onDeleteChapter(c)}
                                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="py-6 text-center text-slate-500"
                                        >
                                            No chapters yet. Add the first chapter above.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}
