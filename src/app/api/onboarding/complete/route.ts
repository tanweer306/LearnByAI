import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userType, ...userData } = body;

    // Get current user from Clerk
    const clerkUser = await currentUser();

    // Determine role based on userType
    let role = "student";
    if (userType === "teacher") {
      role = "teacher";
    } else if (userType === "institution") {
      role = "admin"; // Institutions get admin role
    }

    // Check if user exists in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (existingUser) {
      // Update existing user
      const updateData: any = {
        role: role,
        user_type: userType,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Add common fields
      if (userData.country) updateData.country = userData.country;
      if (userData.timezone) updateData.timezone = userData.timezone;
      if (userData.languagePreference)
        updateData.language_preference = userData.languagePreference;
      if (userData.phoneNumber) updateData.phone_number = userData.phoneNumber;

      // Student-specific fields
      if (userType === "student") {
        if (userData.gradeLevel) updateData.grade_level = userData.gradeLevel;
        if (userData.schoolName) updateData.school_name = userData.schoolName;
        if (userData.dateOfBirth)
          updateData.date_of_birth = userData.dateOfBirth;
      }

      // Teacher-specific fields
      if (userType === "teacher") {
        if (userData.subjects) updateData.subjects = userData.subjects;
        if (userData.yearsOfExperience)
          updateData.years_of_experience = parseInt(userData.yearsOfExperience);
        if (userData.qualification)
          updateData.qualification = userData.qualification;
        if (userData.teachingLevel)
          updateData.teaching_level = userData.teachingLevel;
        if (userData.schoolName) updateData.school_name = userData.schoolName;
      }

      // Institution-specific fields
      if (userType === "institution") {
        if (userData.institutionName)
          updateData.institution_name = userData.institutionName;
        if (userData.institutionType)
          updateData.institution_type = userData.institutionType;
        if (userData.institutionSize)
          updateData.institution_size = userData.institutionSize;
        if (userData.contactPersonName)
          updateData.contact_person_name = userData.contactPersonName;
        if (userData.contactPersonTitle)
          updateData.contact_person_title = userData.contactPersonTitle;
      }

      const { error } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("clerk_user_id", userId);

      if (error) {
        throw error;
      }
    } else {
      // Create new user with all data
      const insertData: any = {
        clerk_user_id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress || "",
        first_name: clerkUser?.firstName || null,
        last_name: clerkUser?.lastName || null,
        role: role,
        user_type: userType,
        onboarding_completed: true,
        country: userData.country || null,
        timezone: userData.timezone || null,
        language_preference: userData.languagePreference || "en",
        phone_number: userData.phoneNumber || null,
      };

      // Add type-specific fields
      if (userType === "student") {
        insertData.grade_level = userData.gradeLevel || null;
        insertData.school_name = userData.schoolName || null;
        insertData.date_of_birth = userData.dateOfBirth || null;
      } else if (userType === "teacher") {
        insertData.subjects = userData.subjects || null;
        insertData.years_of_experience = userData.yearsOfExperience
          ? parseInt(userData.yearsOfExperience)
          : null;
        insertData.qualification = userData.qualification || null;
        insertData.teaching_level = userData.teachingLevel || null;
        insertData.school_name = userData.schoolName || null;
      } else if (userType === "institution") {
        insertData.institution_name = userData.institutionName || null;
        insertData.institution_type = userData.institutionType || null;
        insertData.institution_size = userData.institutionSize || null;
        insertData.contact_person_name = userData.contactPersonName || null;
        insertData.contact_person_title = userData.contactPersonTitle || null;
      }

      const { error } = await supabaseAdmin.from("users").insert(insertData);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
