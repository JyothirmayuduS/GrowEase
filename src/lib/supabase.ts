import { createClient } from "@supabase/supabase-js";
import type { CrmLeadRecord, SkippedRecord } from "@/lib/types/crm";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. Database operations will be skipped.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function storeImportResultInSupabase(
  filename: string,
  imported: CrmLeadRecord[],
  skipped: SkippedRecord[]
) {
  if (!supabaseUrl || !supabaseKey) {
    console.log("Skipping Supabase storage: credentials not configured.");
    return null;
  }

  try {
    // 1. Get or create a workspace user
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    let userId = usersData?.users?.[0]?.id;

    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: "workspace-developer@groweasy.local",
        password: "groweasy-default-secure-password-123",
        email_confirm: true,
      });
      if (createError) {
        console.error("Failed to create default workspace user:", createError);
        return null;
      }
      userId = newUser?.user?.id;
    }

    if (!userId) {
      console.error("No user found or created in Supabase.");
      return null;
    }

    // 2. Create the import job
    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        user_id: userId,
        source_type: "manual_upload",
        filename: filename || "imported_leads.csv",
        original_filename: filename || "imported_leads.csv",
        total_rows: imported.length + skipped.length,
        processed_rows: imported.length + skipped.length,
        imported_rows: imported.length,
        skipped_rows: skipped.length,
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create import job in Supabase:", jobError);
      return null;
    }

    const jobId = job.id;

    // 3. Insert CRM Leads
    if (imported.length > 0) {
      const leadRows = imported.map((l) => ({
        user_id: userId,
        import_job_id: jobId,
        created_at_source: l.created_at || null,
        name: l.name || null,
        email: l.email || null,
        country_code: l.country_code || null,
        mobile_without_country_code: l.mobile_without_country_code || null,
        company: l.company || null,
        city: l.city || null,
        state: l.state || null,
        country: l.country || null,
        lead_owner: l.lead_owner || null,
        crm_status: l.crm_status || null,
        crm_note: l.crm_note || null,
        data_source: l.data_source || null,
        possession_time: l.possession_time || null,
        description: l.description || null,
        original_record: {},
      }));

      const { error: leadsError } = await supabase.from("crm_leads").insert(leadRows);
      if (leadsError) {
        console.error("Failed to save leads to Supabase:", leadsError);
      }
    }

    // 4. Insert Skipped Records
    if (skipped.length > 0) {
      const skipRows = skipped.map((s) => ({
        user_id: userId,
        import_job_id: jobId,
        row_number: s.rowIndex || null,
        original_record: s.raw || {},
        skip_reason: s.reason || null,
        validation_errors: [],
      }));

      const { error: skippedError } = await supabase.from("skipped_records").insert(skipRows);
      if (skippedError) {
        console.error("Failed to save skipped records to Supabase:", skippedError);
      }
    }

    console.log(`Successfully stored ${imported.length} leads in Supabase.`);
    return jobId;
  } catch (err) {
    console.error("Error in storeImportResultInSupabase:", err);
    return null;
  }
}
