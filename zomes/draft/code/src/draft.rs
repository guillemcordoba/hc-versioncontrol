use hdk::{
  entry_definition::ValidatingEntryType,
  error::ZomeApiResult,
  holochain_core_types::{
    cas::content::{Address, AddressableContent, Content},
    dna::entry_types::Sharing,
    entry::Entry,
    error::HolochainError,
    json::JsonString,
  },
};
use std::convert::TryFrom;

#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
pub struct Draft {
  pub draft: Content,
}

impl Draft {
  fn new(draft: Content) -> Draft {
    Draft {
      draft: draft.to_owned(),
    }
  }
}

pub fn definition() -> ValidatingEntryType {
  entry!(
    name: "draft",
    description: "generic draft",
    sharing: Sharing::Public,
    validation_package: || {
      hdk::ValidationPackageDefinition::Entry
    },

    validation: | _validation_data: hdk::EntryValidationData<Draft>| {
      Ok(())
    },

    links: [
      from!(
        "workspace",
        link_type: "draft",
        validation_package: || {
          hdk::ValidationPackageDefinition::ChainFull
        },
        validation: |_validation_data: hdk::LinkValidationData | {
          Ok(())
        }
      )
    ]
  )
}

/**
 * Removes the previous draft from the workspace
 */
fn remove_link_to_draft(entry_address: &Address) -> ZomeApiResult<()> {
  let workspace_address = crate::workspace::workspace_address(entry_address.clone())?;
  let links = hdk::get_links(&workspace_address, Some(String::from("draft")), None)?;

  if links.addresses().len() > 0 {
    hdk::remove_link(&workspace_address, &links.addresses()[0], "draft", "")?;
  }

  Ok(())
}

/**
 * Removes the previous draft if existed,
 * creates or uses the user's workspace for given entry address and
 * stores the given draft in the workspace
 */
pub fn handle_set_draft(entry_address: Address, draft: Option<Content>) -> ZomeApiResult<()> {
  remove_link_to_draft(&entry_address)?;

  if let Some(draft_content) = draft {
    let draft_entry = Entry::App("draft".into(), Draft::new(draft_content).into());
    let draft_address = crate::utils::commit_entry_if_missing(draft_entry)?;

    let workspace_entry = crate::workspace::workspace_entry(entry_address);
    let workspace_address = crate::utils::commit_entry_if_missing(workspace_entry)?;

    hdk::link_entries(&workspace_address, &draft_address, "draft", "")?;
  }

  Ok(())
}

/**
 * Common not found message result
 */
fn not_found_result() -> Content {
  json!({
    "message": "entry has no drafts"
  })
  .into()
}

/**
 * Returns the draft for the given entry_address, returning not found result if it didn't exist
 */
pub fn handle_get_draft(entry_address: Address) -> ZomeApiResult<Content> {
  let workspace_address = crate::workspace::workspace_address(entry_address)?;

  match hdk::get_entry(&workspace_address)? {
    None => Ok(not_found_result()),
    Some(_) => {
      let links = hdk::get_links_and_load(&workspace_address, Some(String::from("draft")), None)?;

      if links.len() == 0 {
        return Ok(not_found_result());
      }

      match Entry::try_from_content(&links[0].to_owned().unwrap().content())? {
        Entry::App(_, entry) => {
          let draft: Draft = Draft::try_from(entry)?;
          Ok(draft.draft)
        }
        _ => Ok(not_found_result()),
      }
    }
  }
}
