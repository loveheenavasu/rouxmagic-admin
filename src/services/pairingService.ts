import { supabase } from '@/lib/supabase';
import { Project, Recipe, PairingSourceEnum } from '@/types';

export const pairingService = {
  /**
   * Search projects that match tag in their own vibe_tags
   * OR are paired with a recipe that matches the tag in flavor_tags.
   * Pairings only have source/target IDs; vibe_tags live in projects, flavor_tags in recipes.
   */
  async searchProjectsByInheritedTag(tag: string): Promise<Project[]> {
    const trimmedTag = tag.trim().toLowerCase();

    const { data: directProjects, error: directError } = await supabase
      .from('projects')
      .select('*')
      .ilike('vibe_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (directError) throw directError;

    // Get recipes that have the tag in flavor_tags, find projects paired with them
    // (This is the "Inherited" part - if a Recipe is "Spicy", maybe the paired Project is relevant?)
    // keeping this logic as it was part of the original intent, but fixing the operator
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .ilike('flavor_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (recipeError) throw recipeError;

    let inheritedProjects: Project[] = [];
    const allProjectIds = new Set<string>();

    if (recipes && recipes.length > 0) {
      const recipeIds = recipes.map(r => r.id);
      const { data: postings, error: pairingError } = await supabase
        .from('pairings')
        .select('*')
        .or(`source_id.in.(${recipeIds.join(',')}),target_id.in.(${recipeIds.join(',')})`)
        .eq('is_deleted', false);

      if (pairingError) throw pairingError;

      if (postings) {
        postings.forEach(p => {
          if (recipeIds.includes(p.source_id)) {
            if (p.target_ref !== PairingSourceEnum.Recipe) allProjectIds.add(p.target_id);
          } else {
             if (p.source_ref !== PairingSourceEnum.Recipe) allProjectIds.add(p.source_id);
          }
        });
      }
    }

    if (allProjectIds.size > 0) {
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .in('id', Array.from(allProjectIds))
          .eq('is_deleted', false);

        if (projectsError) throw projectsError;
        inheritedProjects = projects || [];
    }

    // Combine and remove duplicates
    const allProjects = [...(directProjects || []), ...inheritedProjects];
    const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());
    
    return uniqueProjects;
  },

  /**
   * Search recipes that match tag in their own flavor_tags
   * OR are paired with a project that matches the tag in vibe_tags.
   * Pairings only have source/target IDs; vibe_tags live in projects, flavor_tags in recipes.
   */
  async searchRecipesByInheritedTag(tag: string): Promise<Recipe[]> {
    const trimmedTag = tag.trim().toLowerCase();

    const { data: directRecipes, error: directError } = await supabase
      .from('recipes')
      .select('*')
      .ilike('flavor_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (directError) throw directError;

    // Get projects that have the tag in vibe_tags, find recipes paired with them
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .ilike('vibe_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (projectError) throw projectError;

    let inheritedRecipes: Recipe[] = [];
    const allRecipeIds = new Set<string>();

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const { data: pairings, error: pairingError } = await supabase
        .from('pairings')
        .select('*')
        .or(`source_id.in.(${projectIds.join(',')}),target_id.in.(${projectIds.join(',')})`)
        .eq('is_deleted', false);

      if (pairingError) throw pairingError;

      if (pairings) {
        pairings.forEach(p => {
          if (projectIds.includes(p.source_id)) {
            if (p.target_ref === PairingSourceEnum.Recipe) allRecipeIds.add(p.target_id);
          } else {
             if (p.source_ref === PairingSourceEnum.Recipe) allRecipeIds.add(p.source_id);
          }
        });
      }
    }

    if (allRecipeIds.size > 0) {
        const { data: recipes, error: recipesError } = await supabase
            .from('recipes')
            .select('*')
            .in('id', Array.from(allRecipeIds))
            .eq('is_deleted', false);

        if (recipesError) throw recipesError;
        inheritedRecipes = recipes || [];
    }

    // Combine and remove duplicates
    const allRecipes = [...(directRecipes || []), ...inheritedRecipes];
    const uniqueRecipes = Array.from(new Map(allRecipes.map(r => [r.id, r])).values());

    return uniqueRecipes;
  },

  /** Get vibe_tags from projects paired with recipes. For Recipes page filter. */
  async getVibeTagsForRecipes(): Promise<string[]> {
    const { data: pairings, error: pairError } = await supabase
      .from('pairings')
      .select('source_id, source_ref, target_id, target_ref')
      .eq('is_deleted', false)
      .or('source_ref.eq.Recipe,target_ref.eq.Recipe');

    if (pairError || !pairings?.length) return [];

    const projectIds = pairings
      .map(p => (p.source_ref === PairingSourceEnum.Recipe ? p.target_id : p.source_id))
      .filter(Boolean);

    const { data: projects } = await supabase
      .from('projects')
      .select('vibe_tags')
      .in('id', [...new Set(projectIds)])
      .eq('is_deleted', false);

    const tags = (projects || []).flatMap(p => {
      const raw = p.vibe_tags;
      if (Array.isArray(raw)) return raw.filter(Boolean).map((s: string) => String(s).trim());
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed.filter(Boolean).map((s: string) => String(s).trim()) : [];
        } catch { return []; }
      }
      return [];
    });
    return [...new Set(tags)].filter(Boolean).sort();
  },

  /** Recipe IDs that are paired with a project having this vibe_tag. */
  async getRecipeIdsWithVibeTag(vibe: string): Promise<string[]> {
    const trimmed = vibe.trim().toLowerCase();
    if (!trimmed) return [];

    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .ilike('vibe_tags', `%${trimmed}%`)
      .eq('is_deleted', false);

    if (!projects?.length) return [];

    const projectIds = projects.map(p => p.id);
    const { data: pairings } = await supabase
      .from('pairings')
      .select('source_id, source_ref, target_id, target_ref')
      .eq('is_deleted', false)
      .or(`source_id.in.(${projectIds.join(',')}),target_id.in.(${projectIds.join(',')})`);

    const recipeIds: string[] = [];
    (pairings || []).forEach(p => {
      if (p.source_ref === PairingSourceEnum.Recipe && projectIds.includes(p.target_id))
        recipeIds.push(p.source_id);
      else if (p.target_ref === PairingSourceEnum.Recipe && projectIds.includes(p.source_id))
        recipeIds.push(p.target_id);
    });
    return [...new Set(recipeIds)];
  }
};
