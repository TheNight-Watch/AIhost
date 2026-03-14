#!/usr/bin/env node

/**
 * Verify Supabase Storage buckets for AIHost project
 *
 * This script:
 * 1. Connects to Supabase using service role key
 * 2. Lists existing buckets
 * 3. Creates 'uploads' and 'audio' buckets if missing
 * 4. Tests upload/retrieve functionality
 * 5. Cleans up test files
 * 6. Reports results
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = "https://xvpwphixonefftqfdyhx.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdwaGl4b25lZmZ0cWZkeWh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM2MzgzNiwiZXhwIjoyMDg4OTM5ODM2fQ._fOlhNSer0sPxSdGTy-ZalKl46aAlTHN49xuLETSyGo";

const REQUIRED_BUCKETS = ["uploads", "audio"];
const TEST_FILE_NAME = "test-file.txt";
const TEST_FILE_CONTENT = "This is a test file created at " + new Date().toISOString();

async function main() {
  console.log("🚀 Supabase Storage Verification Script");
  console.log("=======================================\n");

  try {
    // Initialize Supabase client with service role
    console.log("📡 Connecting to Supabase...");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    console.log("✅ Connected to Supabase\n");

    // List existing buckets
    console.log("📋 Listing existing buckets...");
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const existingBucketNames = buckets.map((b) => b.name);
    console.log(`Found ${buckets.length} bucket(s):`);
    buckets.forEach((b) => {
      console.log(`  - ${b.name} (public: ${b.public}, created: ${b.created_at})`);
    });
    console.log();

    // Create missing buckets
    console.log("🔧 Checking for required buckets...");
    const bucketsToCreate = REQUIRED_BUCKETS.filter(
      (name) => !existingBucketNames.includes(name)
    );

    if (bucketsToCreate.length === 0) {
      console.log("✅ All required buckets exist\n");
    } else {
      console.log(`Creating ${bucketsToCreate.length} bucket(s)...`);
      for (const bucketName of bucketsToCreate) {
        const { data, error } = await supabase.storage.createBucket(bucketName, {
          public: false,
        });

        if (error) {
          throw new Error(`Failed to create bucket '${bucketName}': ${error.message}`);
        }

        console.log(`  ✅ Created bucket: ${bucketName}`);
      }
      console.log();
    }

    // Test upload to 'audio' bucket
    console.log("📤 Testing file upload to 'audio' bucket...");
    const testFilePath = path.join(process.cwd(), TEST_FILE_NAME);

    // Create a test file
    fs.writeFileSync(testFilePath, TEST_FILE_CONTENT);
    const fileBuffer = fs.readFileSync(testFilePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("audio")
      .upload(TEST_FILE_NAME, fileBuffer, {
        contentType: "text/plain",
        upsert: true,
      });

    if (uploadError) {
      // Clean up local test file
      fs.unlinkSync(testFilePath);
      throw new Error(`Failed to upload test file: ${uploadError.message}`);
    }

    console.log(`✅ File uploaded successfully: ${TEST_FILE_NAME}`);
    console.log(`   Path: ${uploadData.path}\n`);

    // Test retrieve
    console.log("📥 Testing file retrieval...");
    const { data: retrieveData, error: retrieveError } = await supabase.storage
      .from("audio")
      .download(TEST_FILE_NAME);

    if (retrieveError) {
      throw new Error(`Failed to retrieve test file: ${retrieveError.message}`);
    }

    const retrievedContent = await retrieveData.text();
    if (retrievedContent === TEST_FILE_CONTENT) {
      console.log("✅ File retrieved successfully and content matches\n");
    } else {
      throw new Error("Retrieved file content does not match original");
    }

    // Clean up test file
    console.log("🧹 Cleaning up test file...");
    const { error: deleteError } = await supabase.storage
      .from("audio")
      .remove([TEST_FILE_NAME]);

    if (deleteError) {
      throw new Error(`Failed to delete test file: ${deleteError.message}`);
    }

    console.log(`✅ Test file deleted from storage\n`);

    // Clean up local test file
    fs.unlinkSync(testFilePath);

    // Final report
    console.log("📊 Verification Summary");
    console.log("======================");
    console.log(`✅ Supabase connection: OK`);
    console.log(`✅ Bucket listing: OK`);
    console.log(`✅ Bucket creation: OK`);
    console.log(`✅ File upload: OK`);
    console.log(`✅ File retrieval: OK`);
    console.log(`✅ File cleanup: OK`);
    console.log("\n🎉 All storage verifications passed!");
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main();
