
# School Database Design

## 1. Tables and Their Purpose

### Students

The `students` table stores information about students. It contains
a unique student ID, the student's name, and their email address.
The student ID is the primary key, while the email address is
required and must be unique to prevent duplicate student emails.

### Courses

The `courses` table stores information about courses offered by
the school. It contains a course ID, course name, and course code.
The course ID is the primary key, and the course code is unique
and required.

### Enrolments

The `enrolments` table records which students are enrolled in
which courses. It contains an enrolment ID, student ID, course ID,
and grade. The student ID and course ID are foreign keys that
reference the Students and Courses tables, respectively.

The combination of student ID and course ID must be unique,
preventing a student from enrolling in the same course twice.
The grade can be NULL until an assessment result is available.

## 2. Relationships Between Tables

### One-to-Many Relationships

There is a one-to-many relationship between Students and
Enrolments because one student can have several enrolment records,
but each enrolment belongs to one student.

There is also a one-to-many relationship between Courses and
Enrolments because one course can have several enrolment records,
but each enrolment refers to one course.

### Many-to-Many Relationship

Students and Courses have a many-to-many relationship. A student
can take several courses, and a course can have several students.

The Enrolments table acts as a join table between Students and
Courses. It resolves the many-to-many relationship into two
one-to-many relationships. It also stores information specific
to the relationship, such as the student's grade in a course.

## 3. Index Recommendation

I would add an index on `enrolments(course_id)` to improve queries
that retrieve students enrolled in a particular course and queries
that group enrolments by course.

The UNIQUE constraint on `(student_id, course_id)` already creates
an index that helps find enrolments for a particular student-course
combination.

Example:

    CREATE INDEX idx_enrolments_course_id
    ON enrolments(course_id);

## 4. SQL or NoSQL?

I would choose a relational SQL database, specifically SQLite,
for this school system. The data has clearly defined relationships
between students, courses, and enrolments. SQL supports primary
keys, foreign keys, unique constraints, and transactions, helping
maintain data integrity and prevent invalid or duplicate records.
JOIN operations make it straightforward to retrieve course lists,
student lists, grades, and enrolment statistics. SQLite is also
lightweight and easy to use for a small school application or
learning project. A NoSQL database could be useful for a system
with highly variable data structures or different scalability
requirements, but a relational database is the more suitable
choice for this structured school database.
