import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Comprehensive Assignment Creation API
 * Supports multi-question assignments with various question types
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      // Basic info
      title,
      description,
      instructions,
      bookId,
      
      // Settings
      assignmentType = 'manual',
      difficulty = 'medium',
      totalPoints,
      passingScore,
      dueDate,
      availableFrom,
      lateSubmissionAllowed = true,
      latePenaltyPercentage = 0,
      submissionType = 'online',
      allowAttachments = false,
      maxAttachments = 5,
      gradingType = 'manual',
      showCorrectAnswers = false,
      showAnswersAfter,
      randomizeQuestions = false,
      randomizeOptions = false,
      timeLimit,
      attemptsAllowed = 1,
      
      // Questions array
      questions = [],
      
      // Classes to assign
      classIds = [],
      
      // Status
      status = 'draft',
    } = body;

    // Validate required fields
    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    if (status === 'published' && (!questions || questions.length === 0)) {
      return NextResponse.json(
        { error: "Cannot publish assignment without questions" },
        { status: 400 }
      );
    }

    if (status === 'published' && (!classIds || classIds.length === 0)) {
      return NextResponse.json(
        { error: "Cannot publish assignment without assigning to classes" },
        { status: 400 }
      );
    }

    // Get teacher's Supabase user ID
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: "Teacher not found" },
        { status: 404 }
      );
    }

    if (teacher.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create assignments" },
        { status: 403 }
      );
    }

    // Calculate total points from questions if not provided
    const calculatedTotalPoints = totalPoints || 
      questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .insert({
        teacher_id: teacher.id,
        book_id: bookId || null,
        title,
        description: description || null,
        instructions: instructions || null,
        assignment_type: assignmentType,
        difficulty,
        total_points: calculatedTotalPoints,
        passing_score: passingScore || null,
        due_date: new Date(dueDate).toISOString(),
        available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
        late_submission_allowed: lateSubmissionAllowed,
        late_penalty_percentage: latePenaltyPercentage,
        submission_type: submissionType,
        allow_attachments: allowAttachments,
        max_attachments: maxAttachments,
        grading_type: gradingType,
        show_correct_answers: showCorrectAnswers,
        show_answers_after: showAnswersAfter ? new Date(showAnswersAfter).toISOString() : null,
        randomize_questions: randomizeQuestions,
        randomize_options: randomizeOptions,
        time_limit: timeLimit || null,
        attempts_allowed: attemptsAllowed,
        status,
      })
      .select()
      .single();

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      return NextResponse.json(
        { error: "Failed to create assignment", details: assignmentError.message },
        { status: 500 }
      );
    }

    // Insert questions
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        assignment_id: assignment.id,
        question_number: index + 1,
        question_type: q.questionType,
        question_text: q.questionText,
        question_html: q.questionHtml || null,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correctAnswer || null,
        correct_answers: q.correctAnswers ? JSON.stringify(q.correctAnswers) : null,
        explanation: q.explanation || null,
        hints: q.hints || null,
        points: q.points || 10,
        required: q.required !== false,
        grading_rubric: q.gradingRubric ? JSON.stringify(q.gradingRubric) : null,
        metadata: q.metadata ? JSON.stringify(q.metadata) : '{}',
      }));

      const { error: questionsError } = await supabaseAdmin
        .from("assignment_questions")
        .insert(questionsToInsert);

      if (questionsError) {
        console.error("Error creating questions:", questionsError);
        // Rollback: delete assignment
        await supabaseAdmin.from("assignments").delete().eq("id", assignment.id);
        return NextResponse.json(
          { error: "Failed to create questions", details: questionsError.message },
          { status: 500 }
        );
      }
    }

    // Assign to classes if publishing
    if (status === 'published' && classIds && classIds.length > 0) {
      // Verify teacher owns all classes
      const { data: teacherClasses } = await supabaseAdmin
        .from("classes")
        .select("id")
        .eq("teacher_id", teacher.id)
        .in("id", classIds);

      if (!teacherClasses || teacherClasses.length !== classIds.length) {
        return NextResponse.json(
          { error: "You don't have permission for one or more classes" },
          { status: 403 }
        );
      }

      // Create assignment-class relationships
      const assignmentClasses = classIds.map((classId: string) => ({
        assignment_id: assignment.id,
        class_id: classId,
        assigned_by: teacher.id,
      }));

      const { error: assignClassError } = await supabaseAdmin
        .from("assignment_classes")
        .insert(assignmentClasses);

      if (assignClassError) {
        console.error("Error assigning to classes:", assignClassError);
      }

      // Get all students from assigned classes
      const { data: students } = await supabaseAdmin
        .from("class_members")
        .select("user_id, class_id")
        .in("class_id", classIds)
        .eq("role", "student");

      // Create submissions for all students
      if (students && students.length > 0) {
        // Remove duplicates (students in multiple classes)
        const uniqueStudents = Array.from(
          new Set(students.map((s) => s.user_id))
        ).map((userId) => ({
          assignment_id: assignment.id,
          student_id: userId,
          status: "draft",
          total_points: calculatedTotalPoints,
        }));

        const { error: submissionsError } = await supabaseAdmin
          .from("assignment_submissions")
          .insert(uniqueStudents);

        if (submissionsError) {
          console.error("Error creating submissions:", submissionsError);
        }

        // Create notifications
        const notifications = uniqueStudents.map((s) => ({
          user_id: s.student_id,
          type: "assignment_created",
          title: "New Assignment",
          message: `New assignment "${title}" has been posted. Due: ${new Date(dueDate).toLocaleDateString()}`,
          link: `/dashboard/student/assignments/${assignment.id}`,
        }));

        await supabaseAdmin.from("notifications").insert(notifications);
      }
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        status: assignment.status,
        totalQuestions: questions.length,
        totalPoints: calculatedTotalPoints,
        assignedToClasses: classIds.length,
      },
      message: status === 'published' 
        ? "Assignment published and assigned successfully" 
        : "Assignment saved as draft",
    });
  } catch (error) {
    console.error("Error in assignment creation:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}