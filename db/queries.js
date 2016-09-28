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
    + "ORDER BY username",

  SELECT_ALL_IDENTITIES_BY_PROJECT_AND_DICT_CONTEXT:
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

  SELECT_COMMIT_USERS_BY_PROJECT:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Commits c, Categories cat, CommitCategories cc "
    + "WHERE u.id = i.user "
    + " AND cat.id = cc.category "
    + " AND c.id = cc.commitId "
    + " AND c.author = i.id "
    + " AND c.project = ? "
    + "ORDER BY username",

  SELECT_BUG_CATEGORY_USERS_BY_PROJECT_AND_DICT:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.name as iname, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp "
    + "WHERE u.id = i.user "
    + " AND b.id = bc.bug "
    + " AND bc.category = cat.id "
    + " AND b.identity = i.id "
    + " AND comp.id = b.component "
    + " AND comp.project = ? "
    + " AND cat.dictionary = ? "
    + "ORDER BY username",

  SELECT_BUG_CATEGORY_USERS_BY_PROJECT_AND_DICT_AND_YEAR:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.name as iname, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp "
    + "WHERE u.id = i.user "
    + " AND b.id = bc.bug "
    + " AND bc.category = cat.id "
    + " AND b.identity = i.id "
    + " AND comp.id = b.component "
    + " AND comp.project = ? "
    + " AND cat.dictionary = ? "
    + " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? "           // year
    + "ORDER BY username",

  SELECT_BUG_CATEGORY_USERS_BY_PROJECT_AND_YEAR:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.name as iname, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp "
    + "WHERE u.id = i.user "
    + " AND b.id = bc.bug "
    + " AND bc.category = cat.id "
    + " AND b.identity = i.id "
    + " AND comp.id = b.component "
    + " AND comp.project = ? "
    + " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? "           // year
    + "ORDER BY username",

  SELECT_BUG_CATEGORY_USERS_BY_PROJECT:
      "SELECT DISTINCT u.name as username, "
    + " u.id as uid, "
    + " i.id as iid, "
    + " i.name as iname, "
    + " i.context as icontext "
    + "FROM "
    + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp "
    + "WHERE u.id = i.user "
    + " AND b.id = bc.bug "
    + " AND bc.category = cat.id "
    + " AND b.identity = i.id "
    + " AND comp.id = b.component "
    + " AND comp.project = ? "
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
    + " Categories.name as category, COUNT(*) as amount "
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

  SELECT_COMMIT_CATEGORIES_BY_DICT:
      "SELECT "
    + " Categories.name as category, COUNT(*) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories, Dictionary "
    + "WHERE "
    + " Commits.id=CommitCategories.commitId "
    + " AND Commits.project = ? "
    + " AND CommitCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    + " AND Categories.dictionary = ? "
    // + " AND Commits.committer = ? "
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

  SELECT_BUG_CATEGORIES_BY_PROJECT:
      "SELECT "
    + " Categories.name as category, COUNT(*) as amount "
    + "FROM "
    + " BugCategories, Categories, Dictionary, Components, Bugs "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ? "
    + " AND BugCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    + " GROUP BY BugCategories.category "
    + " UNION SELECT 'uncategorised', (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component = Components.id AND Components.project = ?)"
    + " - (SELECT COUNT(*) FROM Bugs, Components, BugCategories WHERE Bugs.component=Components.id AND Components.project = ? AND BugCategories.bug = Bugs.id)",

  SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT:
      "SELECT "
    + " Bugs.creation as creation, Categories.name as category, COUNT(*) as amount "
    + "FROM "
    + " BugCategories, Categories, Dictionary, Components, Bugs "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ? "
    + " AND BugCategories.category=Categories.id "
    + " AND Categories.dictionary=Dictionary.id "
    + " AND Dictionary.project = ? "
    + " AND Categories.dictionary = ? "
    + " GROUP BY BugCategories.category "
    + " UNION SELECT Bugs.creation, 'uncategorised', (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component = Components.id AND Components.project = ?)"
    + " - (SELECT COUNT(*) FROM Bugs, Components, BugCategories WHERE Bugs.component=Components.id AND Components.project = ? AND BugCategories.bug = Bugs.id)"
    + " FROM Bugs, BugCategories, Categories, Components, Dictionary "
    + " WHERE Bugs.id = BugCategories.bug AND BugCategories.category=Categories.id "
    + "  AND Categories.dictionary=Dictionary.id "
    + "  AND Components.id = Bugs.component "
    + "  AND Components.project = ? "
    + "  AND Categories.dictionary = ? "
    + "  GROUP BY BugCategories.category",

  SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY_AND_YEAR:
      "SELECT "
    + " Categories.name as category, COUNT(*) as amount, Bugs.creation, CAST(strftime('%m', Bugs.creation) AS INTEGER) as month "
    + "FROM "
    + " Categories, Bugs, BugCategories, Components "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ?   "
    + " AND Categories.id = BugCategories.category "
    + " AND Categories.dictionary = ? "
    + " AND Bugs.identity = ? "
    + " AND CAST(strftime('%Y', Bugs.creation) AS INTEGER) = ? "           // year
    + " GROUP BY BugCategories.category ",

  // SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR:
  //     "SELECT "
  //   + " Categories.name as category, COUNT(*) as amount, Bugs.creation, CAST(strftime('%m', Bugs.creation) AS INTEGER) as month "
  //   + "FROM "
  //   + " Categories, Bugs, BugCategories, Components "
  //   + "WHERE "
  //   + " Bugs.id = BugCategories.bug "
  //   + " AND Components.id = Bugs.component "
  //   + " AND Components.project = ?   "
  //   + " AND Categories.id = BugCategories.category "
  //   + " AND Categories.dictionary = ? "
  //   + " AND CAST(strftime('%Y', Bugs.creation) AS INTEGER) = ? "           // year
  //   + " GROUP BY BugCategories.category ",

  SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR:
      "SELECT "
    + " Categories.name as category, COUNT(Bugs.id) as amount, Bugs.creation, CAST(strftime('%m', Bugs.creation) AS INTEGER) as month "
    + "FROM "
    + " Categories, Bugs, BugCategories, Components "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ?   "
    + " AND Categories.id = BugCategories.category "
    + " AND Categories.dictionary = ? "
    + " AND CAST(strftime('%Y', Bugs.creation) AS INTEGER) = ? "           // year
    + " GROUP BY strftime('%m', Bugs.creation), Categories.name",

  SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY:
      "SELECT "
    + " Categories.name as category, COUNT(*) as amount, Bugs.creation, CAST(strftime('%m', Bugs.creation) AS INTEGER) as month "
    + "FROM "
    + " Categories, Bugs, BugCategories, Components "
    + "WHERE "
    + " Bugs.id = BugCategories.bug "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ?   "
    + " AND Categories.id = BugCategories.category "
    + " AND Categories.dictionary = ? "
    + " AND Bugs.identity = ? "
    + " GROUP BY BugCategories.category ",

  SELECT_LINKED_COMMITS:
      "SELECT "
    + " 'Linked' as category,"
    + " (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId=Commits.id AND Commits.project = ?) amount "
    + "UNION "
    + " SELECT 'Unlinked',"
    + "   (SELECT COUNT(*) FROM Commits WHERE project = ?)"
    + "   - "
    + "   (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId = Commits.id AND Commits.project = ?)",

  SELECT_LINKED_BUGS:
      "SELECT "
    + " 'Linked' as category,"
    + " (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug=Bugs.id AND Bugs.component=Components.id AND Components.project = ?) as amount "
    + "UNION "
    + " SELECT 'Unlinked',"
    + "   (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component=Components.id AND Components.project = ?)"
    + "   - "
    + "   (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug = Bugs.id AND Bugs.component=Components.id AND Components.project = ?)",

  SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT:
      "SELECT "
    + " Categories.name as category, Commits.title, Commits.date as date, CAST(strftime('%m', Commits.date) AS INTEGER) as month, COUNT(Commits.id) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories "
    + "WHERE Commits.id = CommitCategories.commitId "
    + " AND CommitCategories.category=Categories.id "
    + " AND Categories.dictionary = $dict "                                   // dict
    + " AND Commits.project = $project "                                      // project
    + " GROUP BY strftime('%m', Commits.date), Categories.name",

  SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_AUTHOR:
      "SELECT "
    + " Categories.name as category, Commits.title, Commits.date as date, CAST(strftime('%m', Commits.date) AS INTEGER) as month, COUNT(Commits.id) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories "
    + "WHERE Commits.id = CommitCategories.commitId "
    + " AND CommitCategories.category=Categories.id "
    + " AND Commits.author = $author "                                        // author
    + " AND Categories.dictionary = $dict "                                   // dict
    + " AND Commits.project = $project "                                      // project
    + " GROUP BY strftime('%m', Commits.date), Categories.name",

  SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR:
      "SELECT "
    + " Categories.name as category, Commits.title, Commits.date as date, CAST(strftime('%m', Commits.date) AS INTEGER) as month, COUNT(Commits.id) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories "
    + "WHERE Commits.id = CommitCategories.commitId "
    + " AND CommitCategories.category=Categories.id "
    + " AND Categories.dictionary = $dict "                                   // dict
    + " AND Commits.project = $project "                                      // project
    + " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year "           // year
    + " GROUP BY strftime('%m', Commits.date), Categories.name",

  // Commits per Author
  SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR_AND_AUTHOR:
      "SELECT "
    + " Categories.name as category, Commits.title, Commits.date as date, CAST(strftime('%m', Commits.date) AS INTEGER) as month, COUNT(Commits.id) as amount "
    + "FROM "
    + " Commits, CommitCategories, Categories, Identities "
    + "WHERE Commits.id = CommitCategories.commitId "
    + " AND CommitCategories.category=Categories.id "
    + " AND Commits.author = $author "                                        // author
    + " AND Categories.dictionary = $dict "                                   // dict
    + " AND Commits.project = $project "                                      // project
    + " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year "           // year
    + " AND Commits.author = Identities.id "
    + " GROUP BY strftime('%m', Commits.date), Categories.name",

  SELECT_START_DATE:
    "SELECT"
    + " min(date) as date "
    + "FROM "
    + " Commits "
    + "WHERE "
    + " project = ?",

  SELECT_COMMIT_YEARS_BY_PROJECT:
    "SELECT"
    + " DISTINCT CAST(strftime('%Y', date) AS INTEGER) as year "
    + "FROM "
    + " Commits "
    + "WHERE "
    + " project = ?",

  // SELECT_COMMIT_YEARS_BY_PROJECT:
  //     "SELECT "
  //   + " DISTINCT CAST(strftime('%Y', Commits.date) AS INTEGER) as year"
  //   + "FROM "
  //   + " Commits, CommitCategories, Categories, Identities "
  //   + "WHERE Commits.id = CommitCategories.commitId "
  //   + " AND CommitCategories.category=Categories.id "
  //   + " AND Commits.author = Identities.id "
  //   + " AND Commits.project = ? ",

  SELECT_BUG_YEARS_BY_PROJECT_AND_DICT:
      "SELECT "
    + " DISTINCT CAST(strftime('%Y', Bugs.creation) AS INTEGER) as year "
    + "FROM "
    + " Bugs, BugCategories, Categories, Identities, Components "
    + "WHERE Bugs.id = BugCategories.bug "
    + " AND BugCategories.category=Categories.id "
    + " AND Bugs.identity = Identities.id "
    + " AND Components.id = Bugs.component "
    + " AND Components.project = ?   "
    + " AND Categories.dictionary = ? ",

  SELECT_COMMIT_YEARS_BY_PROJECT_AND_DICT:
      "SELECT "
    + " DISTINCT CAST(strftime('%Y', Commits.date) AS INTEGER) as year "
    + "FROM "
    + " Commits, CommitCategories, Categories, Identities "
    + "WHERE Commits.id = CommitCategories.commitId "
    + " AND CommitCategories.category=Categories.id "
    + " AND Commits.author = Identities.id "
    + " AND Commits.project = ? "
    + " AND Categories.dictionary = ? "
};

module.exports = queries;