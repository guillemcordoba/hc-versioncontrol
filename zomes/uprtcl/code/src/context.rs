use crate::{perspective, utils};
use hdk::{
  entry_definition::ValidatingEntryType,
  error::ZomeApiResult,
  holochain_core_types::{
    cas::content::Address, dna::entry_types::Sharing, entry::Entry, error::HolochainError,
    json::JsonString, link::LinkMatch, signature::Provenance,
  },
  AGENT_ADDRESS, PUBLIC_TOKEN,
};
use holochain_wasm_utils::api_serialization::get_entry::{GetEntryOptions, GetEntryResult};
use std::convert::TryInto;

#[derive(Serialize, Deserialize, Debug, DefaultJson, Clone)]
pub struct Context {
  creatorId: Address,
  timestamp: u128,
  nonce: u128,
}

pub fn definition() -> ValidatingEntryType {
  entry!(
    name: "context",
    description: "a context associated with different perspectives",
    sharing: Sharing::Public,

    validation_package: || {
      hdk::ValidationPackageDefinition::ChainFull
    },

    validation: |_ctx: hdk::EntryValidationData<Context>| {
      Ok(())
    },

    links: []
  )
}

/** Zome exposed functions */

/**
 * Create a new context with the given properties,
 * and associates its previous address if present
 */
pub fn handle_create_context(
  previous_address: Option<Address>,
  context: Context,
) -> ZomeApiResult<Address> {
  let context_entry = context_entry(context);
  // TODO: change for commit_entry_custom_provenance
  let context_address = utils::store_entry_if_new(&context_entry)?;

  utils::set_entry_proxy(context_address.clone(), Some(context_address.clone()))?;

  if let Some(proxy_address) = previous_address {
    utils::set_entry_proxy(proxy_address.clone(), Some(context_address.clone()))?;
  }

  Ok(context_address)
}

/**
 * Retrieves the information about the context
 */
pub fn handle_get_context_info(context_address: Address) -> ZomeApiResult<GetEntryResult> {
  hdk::get_entry_result(&context_address, GetEntryOptions::default())
}

/**
 * Returns the perspectives of the context
 */
pub fn handle_get_context_perspectives(
  context_address: Address,
) -> ZomeApiResult<Vec<ZomeApiResult<GetEntryResult>>> {
  let response = hdk::call(
    hdk::THIS_INSTANCE,
    "proxy",
    Address::from(PUBLIC_TOKEN.to_string()),
    "get_links_from_proxy",
    json!({ "proxy_address": context_address, "link_type": "perspectives", "tag": "" }).into(),
  )?;

  let perspectives_result: ZomeApiResult<Vec<Address>> = response.try_into()?;
  let perspectives_addresses = perspectives_result?;

  let mut perspectives: Vec<ZomeApiResult<GetEntryResult>> = Vec::new();

  for perspective_address in perspectives_addresses {
    perspectives.push(hdk::get_entry_result(
      &perspective_address,
      GetEntryOptions::default(),
    ));
  }

  Ok(perspectives)
}

/**
 * Returns the address of the context with the given properties
 */
pub fn handle_get_context_address(context: Context) -> ZomeApiResult<Address> {
  hdk::entry_address(&context_entry(context))
}

/** Helper functions */

/**
 * Formats the given context as an entry
 */
fn context_entry(context: Context) -> Entry {
  Entry::App("context".into(), context.into())
}

/**
 * Creates a context and returns its address
 */
pub fn create_context(context: Context) -> ZomeApiResult<Address> {
  let context_entry = context_entry(context);
  let context_address = hdk::commit_entry(&context_entry)?;

  Ok(context_address)
}
