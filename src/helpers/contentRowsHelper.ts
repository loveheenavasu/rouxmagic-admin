import { Projects } from "@/api/integrations/supabase/projects/projects";
import { FilterTypeEnum, ContentRow } from "@/types";
import { Flag, Project } from "@/types";

const projectsAPI = Projects as Required<typeof Projects>;

/**
 * Fetches projects based on a content row's filter configuration
 * @param row - The content row containing filter configuration
 * @returns Array of projects matching the filter criteria
 */
export async function fetchProjectsByContentRow(
  row: ContentRow
): Promise<Project[]> {
  try {
    const eqFilters: Array<{ key: any; value: any }> = [];
    const containsFilters: Array<{ key: any; value: any }> = [];
    const overlapsFilters: Array<{ key: any; value: any }> = [];
    const ilikeFilters: Array<{ key: any; value: string }> = [];

    // Build filters based on filter type
    switch (row.filter_type) {
      case FilterTypeEnum.Status:
        if (row.filter_value.includes(",")) {
          overlapsFilters.push({
            key: "status",
            value: row.filter_value.split(",").map((v) => v.trim()),
          });
        } else {
          containsFilters.push({ key: "status", value: [row.filter_value] });
        }
        break;

      case FilterTypeEnum.ContentType:
        if (row.filter_value.includes(",")) {
          // PostgREST or
          (row as any).custom_or = row.filter_value.split(",").map((v) => `content_type.ilike.%${v.trim()}%`).join(",");
        } else {
          ilikeFilters.push({ key: "content_type", value: `%${row.filter_value}%` });
        }
        break;

      case FilterTypeEnum.Flag:
        eqFilters.push({ key: row.filter_value as any, value: true });
        break;

      case FilterTypeEnum.Audiobook:
        ilikeFilters.push({ key: "content_type", value: "%Audiobook%" });
        break;

      case FilterTypeEnum.Song:
        ilikeFilters.push({ key: "content_type", value: "%Song%" });
        break;

      case FilterTypeEnum.Listen:
        (row as any).custom_or = "content_type.ilike.%Audiobook%,content_type.ilike.%Song%";
        break;

      case FilterTypeEnum.Custom:
        console.warn(
          `Custom filter type not fully implemented for: ${row.filter_value}`
        );
        break;

      default:
        console.warn(`Unknown filter type: ${row.filter_type}`);
    }

    // Fetch projects with filters
    const response = await projectsAPI.get({
      eq: eqFilters,
      contains: containsFilters,
      overlaps: overlapsFilters,
      ilike: ilikeFilters,
      or: (row as any).custom_or,
      sort: "order_index",
      sortBy: "asc",
    });

    // Handle response
    if (
      response.flag !== Flag.Success &&
      response.flag !== Flag.UnknownOrSuccess
    ) {
      console.error(`Failed to fetch projects for row "${row.label}":`, response.error);
      return [];
    }

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    // Filter out deleted items
    let projects = (response.data as Project[]).filter(
      (item) => !(item as any).is_deleted
    );

    // Apply max_items limit if specified
    if (row.max_items && row.max_items > 0) {
      projects = projects.slice(0, row.max_items);
    }

    return projects;
  } catch (error) {
    console.error(`Error fetching projects for row "${row.label}":`, error);
    return [];
  }
}

/**
 * Fetches all active content rows for a specific page with their associated projects
 * @param page - The page to fetch content rows for ('home', 'watch', 'listen', 'mylist')
 * @returns Array of content rows with their associated projects
 */
export async function fetchContentRowsWithProjects(
  page: string
): Promise<Array<ContentRow & { projects: Project[] }>> {
  const { ContentRows } = await import(
    "@/api/integrations/supabase/content_rows/content_rows"
  );
  const contentRowsAPI = ContentRows as Required<typeof ContentRows>;

  try {
    // Fetch active content rows for the page
    const response = await contentRowsAPI.get({
      eq: [
        { key: "page", value: page },
        { key: "is_active", value: true },
      ],
      sort: "order_index",
      sortBy: "asc",
    });

    if (
      response.flag !== Flag.Success &&
      response.flag !== Flag.UnknownOrSuccess
    ) {
      console.error(`Failed to fetch content rows for page "${page}":`, response.error);
      return [];
    }

    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    const rows = response.data as ContentRow[];

    // Fetch projects for each row
    const rowsWithProjects = await Promise.all(
      rows.map(async (row) => {
        const projects = await fetchProjectsByContentRow(row);
        return {
          ...row,
          projects,
        };
      })
    );

    // Filter out rows with no projects
    return rowsWithProjects.filter((row) => row.projects.length > 0);
  } catch (error) {
    console.error(`Error fetching content rows for page "${page}":`, error);
    return [];
  }
}
