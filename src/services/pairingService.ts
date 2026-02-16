import { supabase } from '@/lib/supabase';
import { Project, Recipe, PairingSourceEnum } from '@/types';

export const pairingService = {
  /**
   * Search projects that match a tag in their own vibe_tags 
   * OR are paired with a recipe that matches the tag in flavor_tags.
   * OR have a pairing that has the tag in its vibe_tags.
   */
  async searchProjectsByInheritedTag(tag: string): Promise<Project[]> {
    const trimmedTag = tag.trim().toLowerCase();
    
    // 1. Get projects that have the tag in their own vibe_tags (Direct)
    // Using ilike to handle text/json column types where @> fails
    const { data: directProjects, error: directError } = await supabase
      .from('projects')
      .select('*')
      .ilike('vibe_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (directError) throw directError;

    // 2. Get projects from Pairings that have this tag in pairing.vibe_tags
    const { data: vibePairings, error: vibePairingError } = await supabase
      .from('pairings')
      .select('*')
      .ilike('vibe_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (vibePairingError) throw vibePairingError;

    const pairingProjectIds = (vibePairings || []).map(p => {
       // Return the project ID from the pairing
       // A pairing has source and target. We need the one that IS a project.
       // Usually pairings are Recipe <-> Project.
       if (p.source_ref !== PairingSourceEnum.Recipe) return p.source_id;
       if (p.target_ref !== PairingSourceEnum.Recipe) return p.target_id;
       return null;
    }).filter(Boolean) as string[];

    // 3. Get recipes that have the tag in flavor_tags, and find projects paired with them
    // (This is the "Inherited" part - if a Recipe is "Spicy", maybe the paired Project is relevant?)
    // keeping this logic as it was part of the original intent, but fixing the operator
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .ilike('flavor_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (recipeError) throw recipeError;

    let inheritedProjects: Project[] = [];
    
    // IDs from direct pairing matches
    const allProjectIds = new Set(pairingProjectIds);

    // Add IDs from inherited recipe pairings
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
   * Search recipes that match a tag in their own flavor_tags 
   * OR are paired with a project that matches the tag in vibe_tags.
   * OR have a pairing that has the tag in its flavor_tags.
   */
  async searchRecipesByInheritedTag(tag: string): Promise<Recipe[]> {
    const trimmedTag = tag.trim().toLowerCase();

    // 1. Get recipes that have the tag in flavor_tags (Direct)
    const { data: directRecipes, error: directError } = await supabase
      .from('recipes')
      .select('*')
      .ilike('flavor_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (directError) throw directError;

    // 2. Get recipes from Pairings that have this tag in pairing.flavor_tags
    const { data: flavorPairings, error: flavorPairingError } = await supabase
      .from('pairings')
      .select('*')
      .ilike('flavor_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (flavorPairingError) throw flavorPairingError;

    const pairingRecipeIds = (flavorPairings || []).map(p => {
        if (p.source_ref === PairingSourceEnum.Recipe) return p.source_id;
        if (p.target_ref === PairingSourceEnum.Recipe) return p.target_id;
        return null;
    }).filter(Boolean) as string[];


    // 3. Get projects that have the tag in vibe_tags, and find recipes paired with them
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .ilike('vibe_tags', `%${trimmedTag}%`)
      .eq('is_deleted', false);

    if (projectError) throw projectError;

    let inheritedRecipes: Recipe[] = [];
    const allRecipeIds = new Set(pairingRecipeIds);

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
  }
};
