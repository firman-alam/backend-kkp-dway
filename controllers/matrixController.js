const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const GetAllNilai = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT
          p.id_pegawai,
          p.nama AS pegawai_nama,
          h.tahun,
          h.id_penilaian
        FROM
          pegawai p
        JOIN
          data_penilaian_header h ON p.id_pegawai = h.id_pegawai;
      `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
          SELECT
            d.id_kriteria,
            d.nilai,
            k.nama AS kriteria_nama,
            k.code
          FROM
            data_penilaian_detail d
          JOIN
            kriteria k ON d.id_kriteria = k.id_kriteria
          WHERE
            d.id_penilaian_detail = ?;
        `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        nama: headerData.pegawai_nama,
        tahun: headerData.tahun,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetNilai = async (req, res) => {
  const nilaiId = req.params.id

  try {
    // Fetch data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
      SELECT
        p.id_pegawai,
        p.nama AS pegawai_nama,
        h.tahun
      FROM
        pegawai p
      JOIN
        data_penilaian_header h ON p.id_pegawai = h.id_pegawai
      WHERE
        h.id_penilaian = ?;
    `,
      [nilaiId]
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      await connection.end()
      return res.status(404).send('Data not found')
    }

    const headerData = headerResults[0]

    // Fetch details from data_penilaian_detail
    const [detailsResults] = await pool.promise().query(
      `
      SELECT
        d.id_kriteria,
        d.nilai,
        k.nama AS kriteria_nama,
        k.code
      FROM
        data_penilaian_detail d
      JOIN
        kriteria k ON d.id_kriteria = k.id_kriteria
      WHERE
        d.id_penilaian_detail = ?;
    `,
      [nilaiId]
    )

    // Combine header and details data
    const responseData = {
      id_pegawai: headerData.id_pegawai,
      nama: headerData.pegawai_nama,
      tahun: headerData.tahun,
      details: detailsResults,
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const AddNilai = async (req, res) => {
  const { id_pegawai, tahun, details } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Insert into data_penilaian_header table
    const [headerResult] = await pool
      .promise()
      .query(
        'INSERT INTO data_penilaian_header (id_pegawai, tahun, created_by, created_date) VALUES (?, ?, ?, NOW())',
        [id_pegawai, tahun, userId]
      )

    const idPenilaian = headerResult.insertId

    // Insert into data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const detail of details) {
      const detailValues = [
        idPenilaian,
        detail.id_kriteria,
        detail.nilai,
        userId,
      ]

      await pool.promise().query(detailQuery, detailValues)
    }

    // insert into matriks_penilaian_detail table
    const matriksDetailQuery =
      'INSERT INTO matriks_penilaian_detail (id_matriks_detail, id_kriteria, nilai, preferensi, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const detail of details) {
      const matriksDetailValues = [
        idMatriks,
        detail.id_kriteria,
        detail.nilai,
        userId,
      ]

      await pool.promise().query(matriksDetailQuery, matriksDetailValues)
    }

    // Get data from criteria table
    const [criteriaRows] = await pool.promise().query('SELECT * FROM criteria')

    // Get data from matriks_penilaian_detail table
    const [matriksDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail')

    // Loop through details
    for (const detail of details) {
      const { id_kriteria, type } = detail

      // Check for detail id kriteria same as kriteria id kriteria
      const matchingCriteria = criteriaRows.find(
        (criteria) => criteria.id_kriteria === id_kriteria
      )

      if (matchingCriteria) {
        if (matchingCriteria.type === 'benefit') {
          // If type is benefit, get highest nilai in matriks_penilaian_detail with same id kriteria
          const highestBenefit = Math.max(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide detail nilai with highest nilai from matriks_penilaian_detail
          const normalizedValue = detail.nilai / highestBenefit
          const preferensi = normalizedValue * matchingCriteria.bobot
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        } else if (matchingCriteria.type === 'cost') {
          // If type is cost, get lowest nilai in matriks_penilaian_detail with same id kriteria
          const lowestCost = Math.min(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide lowest nilai from matriks_penilaian_detail with detail nilai
          const normalizedValue = lowestCost / detail.nilai
          const preferensi = normalizedValue * matchingCriteria.bobot
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        }
      }
    }

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const EditNilai = async (req, res) => {
  const { id_penilaian, id_pegawai, tahun, details } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Update data_penilaian_header table
    await pool
      .promise()
      .query(
        'UPDATE data_penilaian_header SET id_pegawai = ?, tahun = ?, last_modified_by = ?, last_modified_date = NOW() WHERE id_penilaian = ?',
        [id_pegawai, tahun, userId, id_penilaian]
      )

    // Delete existing details for the given id_penilaian
    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // Insert updated details into data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const detail of details) {
      const detailValues = [
        id_penilaian,
        detail.id_kriteria,
        detail.nilai,
        userId,
      ]

      await pool.promise().query(detailQuery, detailValues)
    }

    res.status(200).json({ message: 'Data updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const DeleteNilai = async (req, res) => {
  const { id_penilaian } = req.params

  try {
    // Check if the record exists in data_penilaian_header
    const [headerResult] = await pool
      .promise()
      .query('SELECT * FROM data_penilaian_header WHERE id_penilaian = ?', [
        id_penilaian,
      ])

    // If the record doesn't exist, return a 404 response
    if (headerResult.length === 0) {
      return res.status(404).json({ message: 'Data not found' })
    }

    // Delete data from data_penilaian_detail
    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // Delete data from data_penilaian_header
    await pool
      .promise()
      .query('DELETE FROM data_penilaian_header WHERE id_penilaian = ?', [
        id_penilaian,
      ])

    res.status(200).json({ message: 'Data deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const GetMatrixs = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
          SELECT
            p.id_pegawai,
          FROM
            pegawai p
          JOIN
            matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai;
        `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
            SELECT
              d.id_kriteria,
              d.nilai,
              k.nama AS kriteria_nama,
              k.code
            FROM
              matriks_penilaian_detail d
            JOIN
              kriteria k ON d.id_kriteria = k.id_kriteria
            WHERE
              d.id_penilaian_detail = ?;
          `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const AddMatrix = async (req, res) => {
  try {
    const matriksDetailQuery =
      'INSERT INTO matriks_penilaian_detail (id_matriks_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const detail of details) {
      const matriksDetailValues = [
        idMatriks,
        detail.id_kriteria,
        detail.nilai,
        userId,
      ]

      await pool.promise().query(matriksDetailQuery, matriksDetailValues)
    }

    // Get data from criteria table
    const [criteriaRows] = await pool.promise().query('SELECT * FROM criteria')

    // Get data from matriks_penilaian_detail table
    const [matriksDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail')

    // Loop through details
    for (const detail of details) {
      const { id_kriteria, type } = detail

      // Check for detail id kriteria same as kriteria id kriteria
      const matchingCriteria = criteriaRows.find(
        (criteria) => criteria.id_kriteria === id_kriteria
      )

      if (matchingCriteria) {
        if (type === 'benefit') {
          // If type is benefit, get highest nilai in matriks_penilaian_detail with same id kriteria
          const highestBenefit = Math.max(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide detail nilai with highest nilai from matriks_penilaian_detail
          const normalizedValue = detail.nilai / highestBenefit
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              userId,
            ])
        } else if (type === 'cost') {
          // If type is cost, get lowest nilai in matriks_penilaian_detail with same id kriteria
          const lowestCost = Math.min(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide lowest nilai from matriks_penilaian_detail with detail nilai
          const normalizedValue = lowestCost / detail.nilai
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              userId,
            ])
        }
      }
    }

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetRanks = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
              SELECT
                p.id_pegawai,
              FROM
                pegawai p
              JOIN
                matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai;
            `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
                SELECT
                  d.id_kriteria,
                  d.nilai,
                  k.nama AS kriteria_nama,
                  k.code
                FROM
                  matriks_penilaian_detail d
                JOIN
                  kriteria k ON d.id_kriteria = k.id_kriteria
                WHERE
                  d.id_penilaian_detail = ?;
              `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  GetAllNilai,
  GetNilai,
  AddNilai,
  EditNilai,
  DeleteNilai,
  GetMatrixs,
  GetRanks,
}
