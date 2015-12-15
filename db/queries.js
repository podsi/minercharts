var queries = {
  SELECT_ALL_IDENTITIES:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.name as iname, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i "
    + "WHERE "
    + " u.id = i.user "
    + "AND "
    + " u.project = ? "
    + "AND "
    + " i.context = ? "
    + "ORDER BY username",

  SELECT_ALL_COMMIT_USERS:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Commits c "
    + "WHERE "
    + " u.id = i.user "
    + "AND "
    + " c.author = i.id "
    + "AND "
    + " c.project = ? "
    + "ORDER BY username",

  SELECT_DICTIONARIES:
      "SELECT "
    + " id, "
    + " name, "
    + " context "
    + "FROM "
    + " Dictionary "
    + "WHERE "
    + " project = ?",

  SELECT_ALL_PROJECTS: "SELECT id, product FROM Projects",

  SELECT_ALL_COMMIT_CATEGORIES:
      "SELECT "
    + " Categories.name as label, COUNT(*) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories, Dictionary "
    + "WHERE "
    + " Commits.id=CommitCategories.commitId "
    + " AND Commits.project = ? "
    + " AND CommitCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    + "GROUP BY "
    + " CommitCategories.category "
    + "UNION "
    + " SELECT "
    + "  'uncategorised', (SELECT COUNT(*) "
    + " FROM "
    + "  Commits "
    + " WHERE "
    + "  Commits.project = ?)"
    + "  - (SELECT COUNT(*) FROM Commits, CommitCategories WHERE Commits.id = CommitCategories.commitId AND Commits.project = ?)",

  SELECT_COMMIT_CATEGORIES_BY_DICT_AND_COMMITTER:
      "SELECT "
    + " Categories.name as label, COUNT(*) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories, Dictionary "
    + "WHERE "
    + " Commits.id=CommitCategories.commitId "
    + " AND Commits.project = ? "
    + " AND CommitCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    + " AND Categories.dictionary = ? "
    + " AND Commits.committer = ? "
    + "GROUP BY "
    + " CommitCategories.category "
    + "UNION "
    + " SELECT "
    + "  'uncategorised', (SELECT COUNT(*) "
    + " FROM "
    + "  Commits "
    + " WHERE "
    + "  Commits.project = ?)"
    + "  - (SELECT COUNT(*) FROM Commits, CommitCategories WHERE Commits.id = CommitCategories.commitId AND Commits.project = ?)",

  SELECT_BUG_CATEGORIES:
      "SELECT "
    + " Categories.name as label, COUNT(*) as amount "
    + "FROM "
    + " BugCategories, Categories, Dictionary, Components, Bugs "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Bugs.component = Components.id "
    + " AND Components.project = ? "
    + " AND BugCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    // + "   AND Categories.dictionary= ? "
    + " GROUP BY BugCategories.category "
    + " UNION SELECT 'uncategorised', (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component = Components.id AND Components.project = ?)"
    + " - (SELECT COUNT(*) FROM Bugs, Components, BugCategories WHERE Bugs.component=Components.id AND Components.project = ? AND BugCategories.bug = Bugs.id)",

  SELECT_LINKED_COMMITS:
      "SELECT "
    + " 'Linked' as label,"
    + " (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId=Commits.id AND Commits.project = ?) amount "
    + "UNION "
    + " SELECT 'Unlinked',"
    + "   (SELECT COUNT(*) FROM Commits WHERE project = ?)"
    + "   - "
    + "   (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId = Commits.id AND Commits.project = ?)",

  SELECT_LINKED_BUGS:
      "SELECT "
    + " 'Linked' as label,"
    + " (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug=Bugs.id AND Bugs.component=Components.id AND Components.project = ?) as amount "
    + "UNION "
    + " SELECT 'Unlinked',"
    + "   (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component=Components.id AND Components.project = ?)"
    + "   - "
    + "   (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug = Bugs.id AND Bugs.component=Components.id AND Components.project = ?)"
};

module.exports = queries;