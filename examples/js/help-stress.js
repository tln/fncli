// Stress cases for help/usage formatting. Run with no args (or --help) and
// eyeball the output. Each command exercises one case:
//
//   analyze     synopsis comment spans two `//` lines — both lines form the
//               one synopsis (terse mode snips it; --help shows it in full)
//   thread      block-comment synopsis with four lines — snipped at three
//               with a bold [...] marker
//   download    long option labels: each drops its description to the next
//               line instead of widening the aligned column
//   sync        many options overflow the inline usage line — collapses to
//               [options], and every option (commented or not) lists below
//   prune       over-long one-line descriptions — snipped at width with [...]
//   checklist   arg docstring mixing prose and an indented YAML example —
//               under --help the prose wraps but the example keeps its
//               indentation and blank lines (preformatted)
//
// Whenever something is snipped, the normally-hidden --help is advertised.
require('fncli')({
  synopsis: 'Stress-test CLI for fncli help formatting (see Formatting.md).',

  analyze( // Print the most recent combined analysis for a thread (id may be a thread
           // id or a message id — we back out to its thread). DB-only for now.
    id // Thread id or message id
  ) {
    console.log(`analyze ${id}`);
  },

  thread( /* Print the thread roster (messages + DB status) for a Gmail threadId.
             Includes per-message labels, sizes, and attachment counts.
             Rows are ordered oldest-first, matching the Gmail UI.
             Requires a synced database; run sync beforehand. */
    threadId
  ) {
    console.log(`thread ${threadId}`);
  },

  download( // Download attachments from messageId to dest (default .).
    messageId, // Gmail message id, eg 18c2f0a9b3d4e5f6
    dest=".",  // Destination directory; created if it does not exist
    {
      includeAttachmentsLargerThan, // Skip attachments below this size, eg 10kb, 2mb
      excludeContentTypes,          // Comma-separated MIME types to skip, eg image/png,application/pdf
      overwriteExistingFiles=false  // Replace files already present in dest instead of skipping them
    }
  ) {
    console.log(`download ${messageId} -> ${dest}`);
  },

  sync( // Synchronize the local database with the remote mailbox.
    {
      since,                // Only sync messages newer than this date (ISO 8601)
      until,                // Only sync messages older than this date (ISO 8601)
      labels,               // Comma-separated label names to restrict the sync
      batchSize="100",      // Messages fetched per API call
      maxRetries="3",       // Retries per batch before giving up
      dryRun=false,         // Print what would change without writing
      quiet=false,
      v: verbose=false      // Print each API request and response summary
    }
  ) {
    console.log('sync');
  },

  checklist( // Post each entry of a YAML file's `messages:` list as its own message.
    fileArg, /* Path to the checklist file. Headers supply target/ref-prefix/username
                and an optional `thread:` mapping; each message may be a literal
                block for multi-line markdown.

                  target: general
                  ref-prefix: C
                  title: "Standup"
                  messages:
                  - First step
                  - |
                    **Multi-line** step
                    - with markdown
             */
    {dev=false}
  ) {
    console.log(`checklist ${fileArg}`);
  },

  prune( // Delete cached message bodies that are no longer referenced by any thread, keeping the most recent copy of each unique attachment so that re-running analyze does not need to refetch anything from the network.
    days="30" // Only prune entries older than this many days; pass 0 to prune everything regardless of age, which is mostly useful when reclaiming disk space on a machine that is running low
  ) {
    console.log(`prune ${days}`);
  },
});
