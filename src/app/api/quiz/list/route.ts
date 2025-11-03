/**
 * Combined API: Assignment creation, quiz listing, assignment submission, and assignment details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

interface CreateAssignmentRequest {
  title: string;
  description: string;
  classId: string;
  dueDate: string;
  totalPoints: number;
  assignmentType: "text" | "quiz";
  quizId?: string;
  instructions?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get teacher from Supabase
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (teacher.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can create assignments" },
        { status: 403 }
      );
    }

    const body: CreateAssignmentRequest = await request.json();
    const {
      title,
      description,
      classId,
      dueDate,
      totalPoints,
      assignmentType,
      quizId,
      instructions,
    } = body;

    // Validate required fields
    if (!title || !classId || !dueDate || !totalPoints || !assignmentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate assignment type
    if (assignmentType === "quiz" && !quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required for quiz assignments" },
        { status: 400 }
      );
    }

    // Verify teacher owns the class
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("id", classId)
      .eq("teacher_id", teacher.id)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: "Class not found or access denied" },
        { status: 404 }
      );
    }

    // If quiz assignment, verify quiz exists and belongs to teacher
    if (assignmentType === "quiz" && quizId) {
      const { data: quizData, error: quizError } = await supabaseAdmin
        .from("quizzes")
        .select("id, title")
        .eq("id", quizId)
        .eq("user_id", teacher.id)
        .single();

      if (quizError || !quizData) {
        return NextResponse.json(
          { error: "Quiz not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .insert({
        title,
        description,
        class_id: classId,
        teacher_id: teacher.id,
        quiz_id: assignmentType === "quiz" ? quizId : null,
        due_date: new Date(dueDate).toISOString(),
        total_marks: totalPoints,
      })
      .select(`
        id,
        title,
        description,
        due_date,
        total_marks,
        created_at,
        classes:class_id (id, name),
        quizzes:quiz_id (id, title)
      `)
      .single();

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      return NextResponse.json(
        { error: "Failed to create assignment" },
        { status: 500 }
      );
    }

    // Get all students in the class for notification
    const { data: students } = await supabaseAdmin
      .from("class_members")
      .select("user_id")
      .eq("class_id", classId)
      .eq("role", "student");

    // Create notifications for all students
    if (students && students.length > 0) {
      const notifications = students.map((student) => ({
        user_id: student.user_id,
        type: "assignment_created",
        title: "New Assignment",
        message: `New assignment "${title}" posted in ${classData.name}`,
        data: {
          assignment_id: assignment.id,
          class_id: classId,
          due_date: assignment.due_date,
        },
      }));

      await supabaseAdmin.from("notifications").insert(notifications);
    }

    console.log(`[Assignment Created] ${teacher.id} created assignment "${title}" for class ${classData.name}`);

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.due_date,
        totalPoints: assignment.total_marks,
        assignmentType,
        class: assignment.classes,
        quiz: assignment.quizzes,
        createdAt: assignment.created_at,
      },
    });
  } catch (error) {
    console.error("Error in assignment creation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";

/**
 * GET /api/quiz/list
 * List all quizzes for the current user with attempt history
 */

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all quizzes for this user
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from("quizzes")
      .select(`
        *,
        books:book_id (
          id,
          title
        ),
        chapters:chapter_id (
          id,
          title,
          chapter_number
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (quizzesError) {
      console.error("Error fetching quizzes:", quizzesError);
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 }
      );
    }

    // Fetch attempts for each quiz
    const quizzesWithAttempts = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        const { data: attempts } = await supabaseAdmin
          .from("quiz_attempts")
          .select("id, score, completed_at")
          .eq("quiz_id", quiz.id)
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          totalQuestions: quiz.total_questions,
          timeLimit: quiz.time_limit,
          book: quiz.books,
          chapter: quiz.chapters,
          createdAt: quiz.created_at,
          attempts: attempts || [],
        };
      })
    );

    return NextResponse.json({
      success: true,
      quizzes: quizzesWithAttempts,
    });
  } catch (error) {
    console.error("Error listing quizzes:", error);
    return NextResponse.json(
      { error: "Failed to list quizzes" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quiz/list
 * Submit an assignment (for students)
 */

interface SubmitAssignmentRequest {
  assignmentId: string;
  textContent?: string;
  quizAttemptId?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student from Supabase
    const { data: student, error: studentError } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.role !== "student") {
      return NextResponse.json(
        { error: "Only students can submit assignments" },
        { status: 403 }
      );
    }

    const body: SubmitAssignmentRequest = await request.json();
    const { assignmentId, textContent, quizAttemptId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Verify assignment exists and student is enrolled in the class
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from("assignments")
      .select(`
        id,
        title,
        due_date,
        class_id,
        quiz_id,
        total_marks
      `)
      .eq("id", assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Check if student is enrolled in the class
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from("class_members")
      .select("id")
      .eq("class_id", assignment.class_id)
      .eq("user_id", student.id)
      .eq("role", "student")
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: "Student not enrolled in this class" },
        { status: 403 }
      );
    }

    // Check if assignment is overdue
    if (new Date(assignment.due_date) < new Date()) {
      return NextResponse.json(
        { error: "Assignment is overdue and cannot be submitted" },
        { status: 400 }
      );
    }

    // For quiz assignments, verify quiz attempt exists and belongs to student
    if (assignment.quiz_id && !quizAttemptId) {
      return NextResponse.json(
        { error: "Quiz attempt ID is required for quiz assignments" },
        { status: 400 }
      );
    }

    if (assignment.quiz_id && quizAttemptId) {
      const { data: quizAttempt, error: quizAttemptError } = await supabaseAdmin
        .from("quiz_attempts")
        .select("id, quiz_id, score")
        .eq("id", quizAttemptId)
        .eq("user_id", student.id)
        .eq("quiz_id", assignment.quiz_id)
        .single();

      if (quizAttemptError || !quizAttempt) {
        return NextResponse.json(
          { error: "Quiz attempt not found or invalid" },
          { status: 404 }
        );
      }
    }

    // Create or update assignment submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("assignment_submissions")
      .upsert({
        assignment_id: assignmentId,
        student_id: student.id,
        quiz_attempt_id: quizAttemptId || null,
        text_content: textContent || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select(`
        id,
        status,
        submitted_at,
        quiz_attempt_id,
        text_content
      `)
      .single();

    if (submissionError) {
      console.error("Error submitting assignment:", submissionError);
      return NextResponse.json(
        { error: "Failed to submit assignment" },
        { status: 500 }
      );
    }

    console.log(`[Assignment Submitted] Student ${student.id} submitted assignment ${assignmentId}`);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submitted_at,
        quizAttemptId: submission.quiz_attempt_id,
        textContent: submission.text_content,
      },
    });
  } catch (error) {
    console.error("Error in assignment submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
