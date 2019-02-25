use boolinator::Boolinator;
use hdk::{
  entry_definition::ValidatingEntryType,
  error::{ZomeApiError, ZomeApiResult},
  holochain_core_types::{
    cas::content::Address, dna::entry_types::Sharing, entry::Entry, error::HolochainError,
    json::JsonString,
  },
};
use std::{collections::HashMap, convert::TryFrom};
use holochain_wasm_utils::api_serialization::get_entry::{GetEntryResult,GetEntryOptions};

#[derive(Eq, PartialEq, Serialize, Deserialize, Debug, DefaultJson)]
pub struct Object {
  data: Option<Address>,
  links: HashMap<String, Address>,
}

impl Object {
  pub fn new(data: Option<Address>, links: HashMap<String, Address>) -> Object {
    Object {
      data: data,
      links: links,
    }
  }

  pub fn from(object_address: &Address) -> ZomeApiResult<Object> {
    match Object::try_from(crate::utils::get_entry_content(object_address)?) {
      Ok(object) => Ok(object),
      Err(err) => Err(ZomeApiError::from(err)),
    }
  }
  
  pub fn get_data(&self) -> Option<Address> {
    self.data.to_owned()
  }

  pub fn get_links(&self) -> HashMap<String, Address> {
    self.links.to_owned()
  }
}

pub fn definition() -> ValidatingEntryType {
  entry!(
    name: "object",
    description: "an abstract object",
    sharing: Sharing::Public,
    native_type: Object,

    validation_package: || {
      hdk::ValidationPackageDefinition::ChainFull
    },

    validation: |object: Object, _ctx: hdk::ValidationData| {
      Ok(())
    },

    links: []
  )
}

/** Exposed zome functions */

pub fn handle_get_entry(address: Address) -> ZomeApiResult<GetEntryResult> {
  hdk::get_entry_result(&address, GetEntryOptions::default())
}

/** Helper functions */

/**
 * Stores the contents of the given tree in the DHT, if it didn't exist before
 */
pub fn store_object(object: Object) -> ZomeApiResult<Address> {
  let object_entry = Entry::App("object".into(), object.into());
  crate::utils::store_entry_if_new(object_entry)
}

/* 
  Stores the contents of the commit in the DHT
  pub fn store_content_object(content: ContentObject) -> ZomeApiResult<Address> {
  let mut links: HashMap<String, Address> = HashMap::new();

  for (key, links_object) in content.links.into_iter() {
    links.insert(key, store_content_object(links_object)?);
  }

  let object_entry = Entry::App(
    "object".into(),
    Object::new(content.data, links).into(),
  );
  crate::utils::store_entry_if_new(object_entry)
}
 */