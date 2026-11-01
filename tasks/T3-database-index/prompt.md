An index on a column speeds up queries that filter on that column, but it slows down writes, because every insert or update has to update the index too. Correct?
