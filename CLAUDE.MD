# FMBP V2 – GENERAL DEVELOPMENT GUIDELINES

Follow these rules for every development task:

1. **Code Quality:** Write clean, modular, reusable, organized, scalable, and human-readable code. Follow industry best practices and maintain proper project structure.

2. **Scalability:** Design features to handle future growth in users, data, API requests, and concurrent operations. Avoid performance bottlenecks and unnecessary complexity.

3. **Security:** Follow security best practices and OWASP guidelines. Prevent vulnerabilities, validate inputs on the backend, implement proper authentication/authorization, and protect sensitive data.

4. **No Assumptions:** Never assume business logic or requirements. Ask me whenever something is unclear, contradictory, or has multiple possible interpretations.

5. **Existing Functionality:** Understand existing code and dependencies before making changes. Never break existing features or unnecessarily modify unrelated code.

6. **Error-Free Code:** Ensure changes introduce no compilation, build, type-checking, or runtime errors. Run relevant checks and fix issues before completing the task.

7. **Database & APIs:** Maintain data integrity, proper relationships, optimized queries, consistent API structures, and backward compatibility. Never make destructive database changes without approval.

8. **UI/UX:** Keep the application simple, intuitive, responsive, and consistent. Consider loading states, empty states, validation, and error scenarios.

9. **Minimal Changes:** Make only necessary changes. Avoid unnecessary refactoring, duplicate code, hardcoding, and additional dependencies.

10. **Change Reporting:** After every task, provide a clear summary of what changed, files added/modified/deleted, feature impact, database/API changes, and test results. Highlight anything requiring manual verification.

11. **Suggestions:** Think proactively. Suggest better approaches for security, scalability, performance, UI/UX, and business functionality. Discuss significant improvements with me before implementing them.

12. **Production Readiness:** Consider real-world usage, unreliable networks, concurrent users, failure handling, and deployment requirements. Do not assume that working locally means production-ready.

13. **Multi-Device Compatible code:** The code must be consistent with iphone as well as android devices. So any code change made, that must be compatible to ios and android.

14. **Using VERSION_UPGRADE.MD File:** Going forward you have to create/update(if file existed) a heading/title in that file and then write the steps to upgrade/resolve the mismatch. And also how to recognize that which title is for which kind of error, please mention this as well.

15. **Open for any suggestions:** I am completely open for any suggestions, best practices. If you have any suggestion, we can discuss.

16. **List down the changes and purpose:** List down the changes you made and purpose of the changes.

17. **Mark Done for given task points:** Please mark Done for the given task points if completed.

**Mandatory Workflow:** Understand → Analyze → Clarify → Plan → Implement → Test → Report.

**Most Important:** Treat FMBP as a long-term production product, not a temporary prototype. Never sacrifice security, code quality, or existing functionality for implementation speed.