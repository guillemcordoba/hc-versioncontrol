use crate::commit::Commit;
use crate::content::{Content, Link};
use hdk::{
  error::{ZomeApiError, ZomeApiResult},
  holochain_core_types::cas::content::Address,
};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap, HashSet};
use std::convert::TryFrom;

/**
 * Merge the given commits' contents and returns a pointer to the new content
 */
pub fn merge_commits_contents(
  from_commit_address: &Address,
  to_commit_address: &Address,
) -> ZomeApiResult<Address> {
  // If both commits point to the same content, return that content
  let from_commit: Commit =
    Commit::try_from(crate::utils::get_entry_content(from_commit_address)?)?;
  let to_commit: Commit = Commit::try_from(crate::utils::get_entry_content(to_commit_address)?)?;

  if from_commit.get_content_address() == to_commit.get_content_address() {
    return Ok(to_commit.get_content_address().to_owned());
  }

  // Else, compute most recent ancestor and try to merge the contents
  let ancestor_commit_address =
    find_most_recent_common_ancestor(from_commit_address, to_commit_address)?;

  let ancestor_commit: Commit =
    Commit::try_from(crate::utils::get_entry_content(&ancestor_commit_address)?)?;

  let ancestor_content = Content::from(ancestor_commit.get_content_address())?;
  let from_content = Content::from(from_commit.get_content_address())?;
  let to_content = Content::from(to_commit.get_content_address())?;

  merge_content(from_content, to_content, ancestor_content)
}

/**
 * Merges the given contents, stores the result and returns its address
 */
fn merge_content(
  from_content: Content,
  to_content: Content,
  ancestor_content: Content,
) -> ZomeApiResult<Address> {
  let merge_result = build_merge_content(from_content, to_content, ancestor_content)?;

  crate::content::store_content(merge_result)
}

/**
 * Builds the merged content from the given contents
 */
fn build_merge_content(
  from_content: Content,
  to_content: Content,
  ancestor_content: Content,
) -> ZomeApiResult<Content> {
  #[derive(Eq, PartialEq, Serialize, Deserialize, Debug)]
  struct MergeLink {
    position: usize,
    address: Address,
  }

  let mut from_links: HashMap<String, MergeLink> = HashMap::new();
  let mut to_links: HashMap<String, MergeLink> = HashMap::new();
  let mut ancestor_links: HashMap<String, MergeLink> = HashMap::new();

  // Iterate over all the keys of the three links objects
  for i in 0..from_content.get_links().len() {
    let link: &Link = from_content.get_links().get(i).unwrap();
    let merge_link = MergeLink {
      position: i,
      address: link.address.clone(),
    };
    from_links.insert(link.name.clone(), merge_link);
  }

  for i in 0..to_content.get_links().len() {
    let link: &Link = to_content.get_links().get(i).unwrap();
    let merge_link = MergeLink {
      position: i,
      address: link.address.clone(),
    };
    to_links.insert(link.name.clone(), merge_link);
  }

  for i in 0..ancestor_content.get_links().len() {
    let link: &Link = ancestor_content.get_links().get(i).unwrap();
    let merge_link = MergeLink {
      position: i,
      address: link.address.clone(),
    };
    ancestor_links.insert(link.name.clone(), merge_link);
  }

  let mut merge_keys: HashSet<String> = from_links.keys().cloned().collect::<HashSet<String>>();
  merge_keys = merge_keys
    .union(&to_links.keys().cloned().collect::<HashSet<String>>())
    .cloned()
    .collect();
  merge_keys = merge_keys
    .union(&ancestor_links.keys().cloned().collect::<HashSet<String>>())
    .cloned()
    .collect();

  let mut merged_contents: HashMap<String, &MergeLink> = HashMap::new();

  // For each key, call get_merge_result and include the result in the merge resulting contents
  for key in merge_keys.into_iter() {
    if let Some(result) = get_merge_result(
      from_links.get(&key),
      to_links.get(&key),
      ancestor_links.get(&key),
    )? {
      merged_contents.insert(key, result);
    }
  }

  let mut keys: Vec<String> = merged_contents.keys().cloned().collect::<Vec<String>>();
  keys.sort_by(|a, b| {
    merged_contents
      .get(a)
      .unwrap()
      .position
      .cmp(&merged_contents.get(b).unwrap().position)
  });

  let mut merged_links: Vec<Link> = Vec::new();
  for key in keys {
    let link = Link::new(&key, &merged_contents.get(&key).unwrap().address);
    merged_links.push(link);
  }

  let merged_data = get_merge_result(
    from_content.get_data(),
    to_content.get_data(),
    ancestor_content.get_data(),
  )?;
  Ok(Content::new(merged_data, merged_links))
}

/**
 * Returns which commit's content (the original commit, the merge source commit or the merge target commit)
 * should be the result of the merge operation
 *
 * Reference: https://stackoverflow.com/questions/30409863/git-merge-internals
 */
fn get_merge_result<T: Eq>(
  maybe_from: Option<T>,
  maybe_to: Option<T>,
  maybe_ancestor: Option<T>,
) -> ZomeApiResult<Option<T>> {
  if maybe_ancestor == maybe_from && maybe_ancestor == maybe_to {
    // If item has not changed, return it
    return Ok(maybe_ancestor);
  } else if maybe_ancestor == maybe_from && maybe_ancestor != maybe_to {
    // If item has changed only in one commit...
    return Ok(maybe_to);
  } else if maybe_ancestor != maybe_from && maybe_ancestor == maybe_to {
    // ...return the changed commit content
    return Ok(maybe_from);
  } else {
    // Any other case, conflict
    return Err(ZomeApiError::from(format!(
      "there was a conflict trying to merge"
    )));
  }
}

/** Most recent common ancestor */

#[derive(Clone, Eq, PartialEq)]
struct DistancedCommit {
  commit_address: Address,
  distance: u32,
}

impl DistancedCommit {
  fn new(commit_address: &Address, distance: u32) -> DistancedCommit {
    DistancedCommit {
      commit_address: commit_address.to_owned(),
      distance: distance,
    }
  }
}

impl Ord for DistancedCommit {
  fn cmp(&self, other: &DistancedCommit) -> Ordering {
    other.distance.cmp(&self.distance)
  }
}

impl PartialOrd for DistancedCommit {
  fn partial_cmp(&self, other: &DistancedCommit) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

/**
 * Computes the most recent common ancestor for the given two nodes
 *
 * Strategy: explore in a BFS the most recent ancestors, stored in a priority queue ordered by
 * distance from original commit
 * Store all visited commits in a HashMap containing only its address, and when we visit an
 * already visited commit, return it
 */
fn find_most_recent_common_ancestor(
  from_commit_address: &Address,
  to_commit_address: &Address,
) -> ZomeApiResult<Address> {
  // Store nodes to visit
  let mut heap: BinaryHeap<DistancedCommit> = BinaryHeap::new();
  // Store visited nodes
  let mut visited_commits: HashMap<Address, u32> = HashMap::new();

  heap.push(DistancedCommit::new(from_commit_address, 0));
  heap.push(DistancedCommit::new(to_commit_address, 0));
  visited_commits.insert(from_commit_address.to_owned(), 0);
  visited_commits.insert(to_commit_address.to_owned(), 0);

  while let Some(DistancedCommit {
    commit_address,
    distance,
  }) = heap.pop()
  {
    let commit: Commit = Commit::try_from(crate::utils::get_entry_content(&commit_address)?)?;
    let new_distance = distance + 1;

    for parent_commit_address in commit.get_parent_commits_addresses().into_iter() {
      if visited_commits.contains_key(&parent_commit_address) {
        return Ok(parent_commit_address);
      }

      heap.push(DistancedCommit::new(&parent_commit_address, new_distance));
      visited_commits.insert(parent_commit_address, new_distance);
    }
  }

  Err(ZomeApiError::from(String::from(
    "commits don't have a common ancestor",
  )))
}