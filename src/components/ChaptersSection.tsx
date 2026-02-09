import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Content } from "@/types";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";

interface ChaptersSectionProps {
    projectId?: string;
    chapters: Content[];
    chaptersLoading: boolean;
    chaptersError: Error | null;
    onAddChapter: () => void;
    onEditChapter: (chapter: Content) => void;
    onDeleteChapter: (chapter: Content) => void;
    parentContentType?: string;
}

import { ContentTypeEnum } from "@/types";

export default function ChaptersSection({
    projectId,
    chapters,
    chaptersLoading,
    chaptersError,
    onAddChapter,
    onEditChapter,
    onDeleteChapter,
    parentContentType,
}: ChaptersSectionProps) {
    const isTvShow = parentContentType === ContentTypeEnum.TvShow;
    const isAudiobook = parentContentType === ContentTypeEnum.Audiobook;

    // Determine title for the section and button
    const sectionTitle = isTvShow ? "Episodes" : "Chapters";
    const addBtnLabel = isTvShow ? "Add episode" : "Add chapter";
    const description = isTvShow
        ? "Add multiple episodes for this TV show."
        : "Add multiple chapters for this content.";

    const colCount = isTvShow ? 4 : (isAudiobook ? 4 : 3);

    return (
        <div className="mt-8 rounded-xl border border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
                <div>
                    <p className="font-semibold text-slate-900">{sectionTitle}</p>
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>
                <Button
                    type="button"
                    onClick={onAddChapter}
                    disabled={!projectId}
                    className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    {addBtnLabel}
                </Button>
            </div>

            {!projectId ? (
                <div className="p-4 text-sm text-slate-600">
                    Save this project first, then you can add chapters.
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
                                    {isTvShow && (
                                        <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 whitespace-nowrap px-4">
                                            S/E
                                        </TableHead>
                                    )}
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 whitespace-nowrap px-4">
                                        {isAudiobook ? "Audio URL" : "Content URL"}
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-3 text-right px-4">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chaptersLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={colCount} className="py-8 text-center">
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
                                            {isTvShow && (
                                                <TableCell className="px-4 py-3 whitespace-nowrap text-slate-600">
                                                    S{c.season_number ?? "-"} E{c.episode_number ?? "-"}
                                                </TableCell>
                                            )}
                                            <TableCell className="px-4 py-3 max-w-[260px] truncate">
                                                {(c as any).content_url || (c as any).youtube_id ? (
                                                    <a
                                                        href={String((c as any).content_url || `https://youtube.com/watch?v=${(c as any).youtube_id}`)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:underline truncate block"
                                                    >
                                                        {String((c as any).content_url || (c as any).youtube_id)}
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
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
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
                                            colSpan={colCount}
                                            className="py-6 text-center text-slate-500"
                                        >
                                            No {isTvShow ? "episodes" : "chapters"} yet. Add the first {isTvShow ? "episode" : "chapter"} above.
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
